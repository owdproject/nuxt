import type { DesktopConfig } from './types'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  addImports,
  addPlugin,
  installModule,
} from '@nuxt/kit'
import { defu } from 'defu'
import {
  assertValidDesktopUserConfig,
  installDesktopPackage,
  mergeDesktopConfig,
  resolveDesktopConfigPath,
  warnDesktopConfigKeys,
  warnLegacyDesktopConfig,
} from './kit/authoring'
import pkg from '../package.json'

export default defineNuxtModule<DesktopConfig>({
  meta: {
    name: '@owdproject/nuxt',
    configKey: 'desktop',
    compatibility: {
      nuxt: '>=3.0.0 || >=4.0.0',
    },
  },
  defaults: {
    theme: undefined,
    apps: [],
    modules: [],
  },
  async setup(options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const require = createRequire(import.meta.url)

    await installModule(require.resolve('@pinia/nuxt'))
    await installModule(require.resolve('@nuxt/fonts'))
    await installModule(require.resolve('@nuxt/icon'), {
      clientBundle: {
        scan: true,
        sizeLimitKb: 256,
      },
    })
    await installModule(require.resolve('@vueuse/nuxt'))
    await installModule(require.resolve('@nuxtjs/i18n'))

    const kitExt = existsSync(resolve('./kit/authoring.js')) ? '.js' : (existsSync(resolve('./kit/authoring.ts')) ? '.ts' : '')
    _nuxt.options.alias['@owdproject/nuxt/kit/defineDesktopApp'] = resolve(`./kit/defineDesktopApp${kitExt}`)
    _nuxt.options.alias['@owdproject/nuxt/kit/defineDesktopPlugin'] = resolve(`./kit/defineDesktopPlugin${kitExt}`)
    _nuxt.options.alias['@owdproject/nuxt/kit/defineDesktopTheme'] = resolve(`./kit/authoring${kitExt}`)
    _nuxt.options.alias['@owdproject/nuxt/kit/defineDesktopConfig'] = resolve(`./kit/authoring${kitExt}`)
    _nuxt.options.alias['@owdproject/nuxt/kit'] = resolve(`./kit/authoring${kitExt}`)
    _nuxt.options.alias['@owdproject/nuxt/runtime'] = resolve('./runtime')
    _nuxt.options.alias['@owdproject/nuxt'] = resolve('./module')




    // Required for Nuxt 4 dev (playgrounds, module graphs): avoids
    // "Vite Node IPC socket path not configured" when using @nuxt/kit pipelines.
    _nuxt.options.experimental = {
      ..._nuxt.options.experimental,
      viteEnvironmentApi:
        _nuxt.options.experimental?.viteEnvironmentApi ?? true,
    }

    _nuxt.options.runtimeConfig.public.desktop = {}

    let clientConfig: any = {
      theme: undefined,
      apps: [],
      modules: [],
    }

    const resolvedConfig = resolveDesktopConfigPath(_nuxt.options.rootDir)

    if (resolvedConfig) {
      warnLegacyDesktopConfig(resolvedConfig)

      _nuxt.options.watch ??= []
      _nuxt.options.watch.push(resolvedConfig.path)

      try {
        clientConfig = (await import(resolvedConfig.path)).default
      } catch (e) {
        const hint =
          'Export default defineDesktopConfig({ theme, apps, modules }) from desktop.config.ts.'
        throw new Error(
          `[@owdproject/nuxt] Cannot load ${resolvedConfig.file}. ${hint}`,
          { cause: e },
        )
      }

      assertValidDesktopUserConfig(clientConfig, resolvedConfig.file)
      const configRecord = clientConfig as Record<string, unknown>
      warnDesktopConfigKeys(configRecord, resolvedConfig.file)
    }

    const desktop = mergeDesktopConfig(options, clientConfig, pkg.version) as Record<
      string,
      unknown
    > & {
      theme?: string
      apps?: string[]
      modules?: string[]
    }
    _nuxt.options.runtimeConfig.public.desktop = desktop

    {
      if (desktop.theme) {
        try {
          await installDesktopPackage(_nuxt, desktop.theme, desktop)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          throw new Error(`[@owdproject/nuxt] Could not load theme "${desktop.theme}". Details: ${msg}`)
        }
      }

      if (Array.isArray(desktop.modules)) {
        for (const modulePath of desktop.modules) {
          try {
            await installDesktopPackage(_nuxt, modulePath, desktop)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            throw new Error(`[@owdproject/nuxt] Could not load module "${modulePath}". Details: ${msg}`)
          }
        }
      }

      if (Array.isArray(desktop.apps)) {
        for (const appPath of desktop.apps) {
          try {
            await installDesktopPackage(_nuxt, appPath, desktop)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            throw new Error(`[@owdproject/nuxt] Could not load app "${appPath}". Details: ${msg}`)
          }
        }
      }
    }

    // assign runtimeConfig desktop prop to appConfig
    // to make it overwritable by components later
    // via ensureAppConfigDesktop
    _nuxt.options.appConfig.desktop = _nuxt.options.runtimeConfig.public.desktop

    {
      // configure scss for vite
      _nuxt.hook('vite:extendConfig', (viteConfig) => {
        viteConfig.css = viteConfig.css || {}
        viteConfig.css.preprocessorOptions =
          viteConfig.css.preprocessorOptions || {}
        viteConfig.css.preprocessorOptions.scss = {
          api: 'modern-compiler',
        }
      })
    }

    {
      try {
        _nuxt.options.css.push(require.resolve('sanitize.css'))
      } catch {
        _nuxt.options.css.push('sanitize.css')
      }
    }

    {
      addComponentsDir({
        path: resolve('./runtime/components'),
        prefix: 'Desktop',
        pathPrefix: false,
        global: true,
      })
    }

    {
      addPlugin(
        resolve('./runtime/plugins/01.desktop-shell-init.client'),
      )
      addPlugin(
        resolve('./runtime/plugins/02.desktop-register-desktop-apps.client'),
      )

      addImportsDir(resolve('./runtime/composables'))
      addImportsDir(resolve('./runtime/stores'))
      addImportsDir(resolve('./runtime/utils'))
      addImportsDir(resolve('./runtime/constants'))

    }
  },
})

export {
  defineDesktopConfig,
  defineDesktopModule,
  defineDesktopTheme,
  hasDesktopModule,
  mergeDesktopExtensionConfig,
  setDesktopExtensionConfig,
} from './kit/authoring'

export * from './composables'
export * from './controllers'
export * from '@owdproject/core'
export type * from './types/index'


export type ModuleOptions = DesktopConfig

declare module '@nuxt/schema' {
  interface NuxtConfig {
    desktop?: DesktopConfig
  }
  interface NuxtOptions {
    desktop?: DesktopConfig
  }
}
