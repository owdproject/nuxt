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
  loadNuxtModuleInstance,
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

const EXTENSION_META_KEYS = [
  'kind', 'framework', 'packageName', 'configKey', 'entry', 'adapter', 'requires',
] as const

/** Read the same module entry and getMeta() metadata that Nuxt's installer uses. */
async function loadModuleMeta(modulePath: string, nuxt?: Nuxt): Promise<Record<string, unknown>> {
  const { nuxtModule, buildTimeModuleMeta } = await loadNuxtModuleInstance(modulePath, nuxt)
  const descriptor = nuxtModule as typeof nuxtModule & { meta?: unknown }
  const declared = typeof descriptor.getMeta === 'function'
    ? await descriptor.getMeta()
    : descriptor.meta
  if (declared !== undefined && (!declared || typeof declared !== 'object' || Array.isArray(declared))) {
    throw new Error(`[@owdproject/nuxt] ${modulePath}: module metadata must be an object.`)
  }
  // Preserve explicitly malformed values (including null) for validation below.
  return { ...buildTimeModuleMeta, ...declared } as Record<string, unknown>
}

/** Reads build-time extension metadata using Nuxt module resolution and getMeta(). */
export async function readExtensionMeta(
  modulePath: string,
  nuxt?: Nuxt,
): Promise<Partial<DesktopExtensionMeta>> {
  const meta = await loadModuleMeta(modulePath, nuxt)
  return Object.fromEntries(EXTENSION_META_KEYS.map(key => [key, meta[key]])) as Partial<DesktopExtensionMeta>
}

/** Validates the declared contract; this alone does not check the host integration. */
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
  for (const key of ['packageName', 'configKey', 'entry', 'adapter'] as const) {
    if (meta[key] !== undefined && (typeof meta[key] !== 'string' || !meta[key].trim())) {
      throw new Error(`[@owdproject/nuxt] ${packageName}: extension meta.${key} must be a non-empty string.`)
    }
  }
  if (meta.requires !== undefined && (!Array.isArray(meta.requires) || !meta.requires.every(
    requirement => typeof requirement === 'string' && requirement.trim().length > 0,
  ))) {
    throw new Error(`[@owdproject/nuxt] ${packageName}: extension meta.requires must be an array of non-empty module/kit names.`)
  }
  return { ...meta } as DesktopExtensionMeta
}

function assertDesktopExtensionHost(
  meta: DesktopExtensionMeta,
  modulePath: string,
  nuxt: Nuxt,
): void {
  if (meta.framework !== 'nuxt') {
    throw new Error(`[@owdproject/nuxt] ${modulePath}: framework "${meta.framework}" is incompatible with the Nuxt host.`)
  }
  if (meta.adapter !== undefined && meta.adapter !== '@owdproject/nuxt') {
    throw new Error(`[@owdproject/nuxt] ${modulePath}: adapter "${meta.adapter}" is incompatible with @owdproject/nuxt.`)
  }
  for (const requirement of meta.requires ?? []) {
    // Configured modules and resolvable packages are not evidence of installed integration.
    // Nuxt records nested installModule() calls too (e.g. kits installed by a theme).
    const installed = nuxt.options._installedModules?.some(({ meta, entryPath }) => {
      if (meta.disabled) return false
      return [meta.name, meta.packageName, meta.rawPath, entryPath].includes(requirement)
    })
    if (!installed) {
      throw new Error(`[@owdproject/nuxt] ${modulePath}: required kit/module "${requirement}" is not active. Install it through the theme or host before this extension.`)
    }
  }
}

/**
 * Installs a desktop theme, module, or app after checking explicit extension metadata.
 * Ordinary Nuxt modules and older name/configKey-only descriptors remain supported.
 */
export async function installDesktopPackage(
  nuxt: Nuxt,
  modulePath: string,
  desktop?: Record<string, unknown>,
): Promise<void> {
  const meta = await loadModuleMeta(modulePath, nuxt)
  // configKey alone is ordinary Nuxt metadata, not an opt-in to the extension contract.
  if (EXTENSION_META_KEYS.some(key => key !== 'configKey' && key in meta)) {
    const extension = assertDesktopExtensionMeta(meta as Partial<DesktopExtensionMeta>, modulePath)
    assertDesktopExtensionHost(extension, modulePath, nuxt)
  }
  const configKey = typeof meta.configKey === 'string' && meta.configKey.length > 0 ? meta.configKey : undefined
  const slice = configKey && desktop ? desktop[configKey] : undefined
  const inline = slice && typeof slice === 'object' && !Array.isArray(slice)
    ? slice as Record<string, unknown>
    : undefined
  await installModule(modulePath, configKey && desktop ? inline ?? {} : undefined, nuxt)
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
