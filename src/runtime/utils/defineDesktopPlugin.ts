import { defineNuxtPlugin } from 'nuxt/app'
import { useDesktop, registerDesktopExtension } from '../composables/useDesktop'
import { useDesktopHooks } from '../composables/useDesktopHooks'
import { useDesktopIPC } from '../composables/useDesktopIPC'
import { useDesktopCommands } from '../composables/useDesktopCommands'
import { useDesktopApplication } from '../composables/useDesktopApplication'
import { useDesktopWindow } from '../composables/window/useDesktopWindow'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'

export interface DesktopPluginContext {
  desktop: ReturnType<typeof useDesktop>
  hooks: ReturnType<typeof useDesktopHooks>
  ipc: ReturnType<typeof useDesktopIPC>
  commands: ReturnType<typeof useDesktopCommands>
  applications: ReturnType<typeof useDesktopApplication>
  windows: ReturnType<typeof useDesktopWindow>
  workspace: ReturnType<typeof useDesktopWorkspaceStore>
  services: ReturnType<typeof useDesktop>['services']
  registerExtension: typeof registerDesktopExtension
}

export function defineDesktopPlugin(
  setup: (ctx: DesktopPluginContext) => void | Promise<void>,
) {
  return defineNuxtPlugin({
    dependsOn: ['pinia', 'desktop-shell-init'],
    async setup() {
      if (import.meta.server) return

      const desktop = useDesktop()
      const ctx: DesktopPluginContext = {
        desktop,
        hooks: useDesktopHooks(),
        ipc: useDesktopIPC(),
        commands: useDesktopCommands(),
        applications: useDesktopApplication(),
        windows: useDesktopWindow(),
        workspace: useDesktopWorkspaceStore(),
        services: desktop.services,
        registerExtension: registerDesktopExtension,
      }

      await setup(ctx)
    },
  })
}
