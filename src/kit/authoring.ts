import type {
  DesktopConfig,
  DesktopExtensionDirs,
  DesktopExtensionKind,
  DesktopExtensionMeta,
  DesktopFramework,
} from '../types'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  defineNuxtModule,
  installModule,
  resolvePath,
  type NuxtModule,
} from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { defu } from 'defu'

/** Root `desktop.config.ts` helper — keep this file free of `import.meta` for jiti. */
export function defineDesktopConfig(config: DesktopConfig) {
  return config
}

/**
 * Default directories a desktop distribution collects extensions from, relative to its
 * root. A Nuxt desktop uses `apps/`, `modules/` and `themes/`; the monorepo keeps
 * framework modules under `packages/`, so both slots are listed.
 */
export const DESKTOP_EXTENSION_DIRS: DesktopExtensionDirs = {
  apps: ['apps'],
  modules: ['modules', 'packages'],
  themes: ['themes'],
}

const FRAMEWORK_SEGMENTS: readonly DesktopFramework[] = [
  'nuxt',
  'vue',
  'react',
  'svelte',
  'angular',
  'astro',
]

const KIND_SEGMENTS: readonly DesktopExtensionKind[] = [
  'app',
  'module',
  'theme',
  'kit',
]

/**
 * Parses a framework-first extension short name (`nuxt-app-todo`, `react-theme-win95`)
 * into its parts. Legacy names without a framework segment (`app-todo`) are accepted
 * with `framework` left undefined. Returns `null` when the kind is unknown.
 */
export function parseDesktopExtensionName(shortName: string): {
  framework?: DesktopFramework
  kind: DesktopExtensionKind
  name: string
} | null {
  const parts = shortName.split('-')
  let framework: DesktopFramework | undefined
  if (FRAMEWORK_SEGMENTS.includes(parts[0] as DesktopFramework)) {
    framework = parts.shift() as DesktopFramework
  }
  const kind = parts[0] as DesktopExtensionKind
  if (!KIND_SEGMENTS.includes(kind)) return null
  return { framework, kind, name: parts.slice(1).join('-') }
}

/**
 * Runtime validation for the object exported from `desktop.config.ts`
 * (or legacy `owd.config.ts`).
 */
export function assertValidDesktopUserConfig(
  config: unknown,
  configFile = 'desktop.config.ts',
): void {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      `[@owdproject/nuxt] ${configFile} must default-export a non-array object from defineDesktopConfig({ ... }).`,
    )
  }

  const c = config as Record<string, unknown>

  if (c.theme != null && typeof c.theme !== 'string') {
    throw new Error(
      `[@owdproject/nuxt] ${configFile}: \`theme\` must be a string (npm package name or local path of the theme module).`,
    )
  }

  if (c.apps !== undefined) {
    if (
      !Array.isArray(c.apps) ||
      !(c.apps as unknown[]).every((item) => typeof item === 'string')
    ) {
      throw new Error(
        `[@owdproject/nuxt] ${configFile}: \`apps\` must be an array of strings (Nuxt module package names or local paths).`,
      )
    }
  }

  if (c.modules !== undefined) {
    if (
      !Array.isArray(c.modules) ||
      !(c.modules as unknown[]).every((item) => typeof item === 'string')
    ) {
      throw new Error(
        `[@owdproject/nuxt] ${configFile}: \`modules\` must be an array of strings (Nuxt module package names or local paths).`,
      )
    }
  }
}

export const DESKTOP_CONFIG_FILENAME = 'desktop.config.ts'
export const LEGACY_DESKTOP_CONFIG_FILENAME = 'owd.config.ts'

export const LEGACY_CONFIG_DEPRECATION =
  '[@owdproject/nuxt] owd.config.ts is deprecated and kept only for backward compatibility; rename to desktop.config.ts.'

export type ResolvedDesktopConfigPath = {
  path: string
  file: string
  legacy: boolean
}

export function resolveDesktopConfigPath(
  rootDir: string,
): ResolvedDesktopConfigPath | null {
  const desktopPath = join(rootDir, DESKTOP_CONFIG_FILENAME)
  const legacyPath = join(rootDir, LEGACY_DESKTOP_CONFIG_FILENAME)
  const hasDesktop = existsSync(desktopPath)
  const hasLegacy = existsSync(legacyPath)

  if (hasDesktop && hasLegacy) {
    console.warn(
      '[@owdproject/nuxt] Both desktop.config.ts and owd.config.ts exist; using desktop.config.ts. Remove owd.config.ts.',
    )
    return { path: desktopPath, file: DESKTOP_CONFIG_FILENAME, legacy: false }
  }

  if (hasDesktop) {
    return { path: desktopPath, file: DESKTOP_CONFIG_FILENAME, legacy: false }
  }

  if (hasLegacy) {
    return {
      path: legacyPath,
      file: LEGACY_DESKTOP_CONFIG_FILENAME,
      legacy: true,
    }
  }

  return null
}

export function warnLegacyDesktopConfig(
  resolved: ResolvedDesktopConfigPath | null | undefined,
): void {
  if (resolved?.legacy) {
    console.warn(LEGACY_CONFIG_DEPRECATION)
  }
}

/** Path used when creating or updating config from the CLI (always the new filename). */
export function desktopConfigWritePath(desktopDir: string): string {
  return join(desktopDir, DESKTOP_CONFIG_FILENAME)
}

/** Nuxt top-level option names — warn if present in desktop.config (likely misconfiguration). */
const NUXT_OPTION_KEYS = new Set([
  'ssr',
  'devtools',
  'vite',
  'nitro',
  'runtimeConfig',
  'app',
  'appConfig',
  'css',
  'plugins',
  'hooks',
  'extends',
  'compatibilityDate',
  'experimental',
  'future',
  'i18n',
  'tailwindcss',
  'primevue',
])

/**
 * Warn when desktop.config.ts contains keys that look like Nuxt options.
 * Extension keys (fs, terminal, custom app namespaces) are intentionally not validated here.
 */
export function warnDesktopConfigKeys(
  config: Record<string, unknown>,
  configFile = 'desktop.config.ts',
): void {
  for (const key of Object.keys(config)) {
    if (NUXT_OPTION_KEYS.has(key)) {
      console.warn(
        `[@owdproject/nuxt] ${configFile}: key "${key}" looks like a Nuxt option and is ignored for _nuxt.options. Move it to nuxt.config.ts; shell values belong under defineDesktopConfig({ systemBar, workspaces, ... }).`,
      )
    }
  }
}

/**
 * Writes a resolved extension namespace to `runtimeConfig.public.desktop[configKey]`.
 * Used by {@link defineDesktopModule} after Nuxt merges inline options with module defaults.
 */
export function setDesktopExtensionConfig(
  nuxt: Nuxt,
  configKey: string,
  resolved: Record<string, unknown>,
): void {
  const pub = (nuxt.options.runtimeConfig.public ??= {}) as {
    desktop?: Record<string, unknown>
  }
  const desktop = (pub.desktop ??= {})
  desktop[configKey] = resolved
}

/**
 * Merges theme or module defaults into an extension namespace on `public.desktop`.
 * User values from desktop.config win over `partial` (defu: partial fills undefined only).
 */
export function mergeDesktopExtensionConfig(
  nuxt: Nuxt,
  configKey: string,
  partial: Record<string, unknown>,
): void {
  const pub = (nuxt.options.runtimeConfig.public ??= {}) as {
    desktop?: Record<string, unknown>
  }
  const desktop = (pub.desktop ??= {})
  const existing = desktop[configKey]
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {}
  desktop[configKey] = defu(partial, base)
}

type ExtensionMetaLike = Partial<DesktopExtensionMeta> & { configKey?: string }

type ModuleLike = {
  meta?: ExtensionMetaLike
  default?: { meta?: ExtensionMetaLike }
  getMeta?: () => Promise<ExtensionMetaLike | undefined>
}

async function readConfigKey(mod: ModuleLike | undefined): Promise<string | undefined> {
  if (!mod) return undefined

  let meta = mod.meta ?? mod.default?.meta

  if (!meta) {
    const getMeta = mod.getMeta ?? (mod as any).default?.getMeta
    if (typeof getMeta === 'function') {
      try {
        meta = await getMeta()
      } catch (e) {
        console.warn('[@owdproject/nuxt] failed to call getMeta():', e)
      }
    }
  }

  const key = meta?.configKey
  return typeof key === 'string' && key.length > 0 ? key : undefined
}

/**
 * Reads the declarative extension contract (`kind`, `framework`, `adapter`, …) from a
 * package's Nuxt module `meta`. Build-time only — no runtime imports. Used to keep the
 * collection contract framework-agnostic across desktop distributions.
 */
export async function readExtensionMeta(
  modulePath: string,
): Promise<Partial<DesktopExtensionMeta>> {
  const meta = (await loadModuleDescriptor(modulePath))?.meta ?? {}
  return {
    kind: meta.kind,
    framework: meta.framework,
    packageName: meta.packageName,
    configKey: meta.configKey,
    entry: meta.entry,
    adapter: meta.adapter,
    requires: meta.requires,
  }
}

/**
 * Validates an extension contract and returns a normalized copy. Throws on an unknown
 * kind/framework so misconfigured extensions fail at build time instead of at runtime.
 */
export function assertDesktopExtensionMeta(
  meta: Partial<DesktopExtensionMeta>,
  packageName = 'unknown',
): DesktopExtensionMeta {
  if (!meta.kind || !KIND_SEGMENTS.includes(meta.kind)) {
    throw new Error(
      `[@owdproject/nuxt] ${packageName}: extension meta.kind must be one of ${KIND_SEGMENTS.join(', ')}.`,
    )
  }
  if (!meta.framework || !FRAMEWORK_SEGMENTS.includes(meta.framework)) {
    throw new Error(
      `[@owdproject/nuxt] ${packageName}: extension meta.framework must be one of ${FRAMEWORK_SEGMENTS.join(', ')}.`,
    )
  }
  return meta as DesktopExtensionMeta
}

async function loadModuleDescriptor(
  modulePath: string,
): Promise<ModuleLike | undefined> {
  try {
    const resolvedPath = await resolvePath(modulePath)
    const imported = await import(resolvedPath)
    return (imported as { default?: ModuleLike }).default ?? imported
  } catch (e) {
    console.warn(`[@owdproject/nuxt] loadModuleDescriptor failed for "${modulePath}":`, e)
    return undefined
  }
}

/**
 * Installs a desktop theme, module, or app package.
 * When the package exposes `meta.configKey`, passes `desktop[configKey]` to `installModule`
 * so Nuxt merges desktop.config with module defaults.
 */
export async function installDesktopPackage(
  nuxt: Nuxt,
  modulePath: string,
  desktop?: Record<string, unknown>,
): Promise<void> {
  const descriptor = await loadModuleDescriptor(modulePath)
  const configKey = await readConfigKey(descriptor)

  if (configKey && desktop) {
    const slice = desktop[configKey]
    const inline =
      slice && typeof slice === 'object' && !Array.isArray(slice)
        ? (slice as Record<string, unknown>)
        : {}
    await installModule(modulePath, inline)
    return
  }

  await installModule(modulePath)
}

type DesktopModuleMeta = {
  name: string
  configKey: string
} & Partial<Omit<DesktopExtensionMeta, 'configKey'>>

type DesktopModuleDefinition = NuxtModule<
  Record<string, unknown>,
  Record<string, unknown>,
  false
> & {
  meta: DesktopModuleMeta
}

/**
 * Nuxt module wrapper for desktop apps and extension modules (`configKey` → desktop.config namespace).
 * Publishes merged options to `runtimeConfig.public.desktop[configKey]` after setup runs.
 */
export function defineDesktopModule(
  definition: DesktopModuleDefinition,
): ReturnType<typeof defineNuxtModule> {
  const configKey = definition.meta.configKey
  if (!configKey) {
    throw new Error(
      '[@owdproject/nuxt] defineDesktopModule requires meta.configKey (e.g. "terminal", "fs", "audit").',
    )
  }

  const userSetup = definition.setup

  return defineNuxtModule({
    ...definition,
    async setup(options, nuxt) {
      setDesktopExtensionConfig(
        nuxt,
        configKey,
        options as Record<string, unknown>,
      )
      if (typeof userSetup === 'function') {
        return userSetup(options, nuxt)
      }
    },
  } as NuxtModule)
}

type DesktopThemeDefinition = NuxtModule<
  Record<string, unknown>,
  Record<string, unknown>,
  false
>

/**
 * Nuxt module wrapper for desktop themes.
 * Merges theme shell defaults into `runtimeConfig.public.desktop` (user desktop.config wins).
 */
export function defineDesktopTheme(
  definition: DesktopThemeDefinition,
): ReturnType<typeof defineNuxtModule> {
  const userSetup = definition.setup

  return defineNuxtModule({
    ...definition,
    meta: {
      ...definition.meta,
      configKey: 'desktop',
    },
    async setup(options, nuxt) {
      const pub = (nuxt.options.runtimeConfig.public ??= {}) as {
        desktop?: Record<string, unknown>
      }
      pub.desktop = defu(
        (pub.desktop ?? {}) as Record<string, unknown>,
        options as Record<string, unknown>,
      )

      if (typeof userSetup === 'function') {
        return userSetup(options, nuxt)
      }
    },
  } as NuxtModule)
}

/**
 * Build-time check if a desktop module, app, or theme is registered in desktop.config.ts.
 * Useful during theme or module setup hooks before Nuxt finishes installing modules.
 */
export function hasDesktopModule(nuxt: Nuxt, packageName: string): boolean {
  const desktop = nuxt.options.runtimeConfig.public.desktop as {
    theme?: string
    modules?: string[]
    apps?: string[]
  } | undefined

  if (!desktop) return false

  const contains = (item: string | undefined) =>
    item ? String(item).includes(packageName) : false

  return (
    contains(desktop.theme) ||
    (desktop.modules?.some(contains) ?? false) ||
    (desktop.apps?.some(contains) ?? false)
  )
}

/** Inline Nuxt options override the file; extension arrays are merged without duplicates. */
export function mergeDesktopConfig(
  inline: DesktopConfig,
  file: DesktopConfig,
  coreVersion: string,
): DesktopConfig {
  assertValidDesktopUserConfig(inline, 'nuxt.config.ts desktop options')
  assertValidDesktopUserConfig(file)
  const merged = defu(inline, file, { coreVersion })
  for (const key of ['apps', 'modules'] as const) {
    if (merged[key]) merged[key] = [...new Set(merged[key])]
  }
  return merged
}
