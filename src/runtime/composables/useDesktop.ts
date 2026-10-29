import { reactive } from 'vue'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopConfig } from './useDesktopConfig'
import { useDesktopIdentity } from './useDesktopIdentity'
import { useDesktopSession } from './useDesktopSession'
import { useDesktopCommands } from './useDesktopCommands'
import { useDesktopDefaultApps } from './useDesktopDefaultApps'
import { useDesktopApplication } from './useDesktopApplication'
import { useDesktopWindow } from './window/useDesktopWindow'
import { useDesktopVolume } from './useDesktopVolume'
import { useDesktopNotification } from './useDesktopNotification'
import { useDesktopTray } from './useDesktopTray'
import { useDesktopIPC } from './useDesktopIPC'
import { useDesktopHooks } from './useDesktopHooks'

// Global reactive services registry for inter-app communication
const services = reactive(new Map<string, any>())

// Global reactive extensions object for dynamic namespace injection
const extensions = reactive<Record<string, any>>({})

export function registerDesktopExtension(name: string, extension: any) {
  extensions[name] = extension
}

const servicesRegistry = Object.freeze({
  register: (id: string, service: any) => {
    services.set(id, service)
  },
  unregister: (id: string) => {
    services.delete(id)
  },
  get: (id: string) => {
    return services.get(id)
  },
  has: (id: string) => {
    return services.has(id)
  },
})

export function useDesktop() {
  return {
    config: useDesktopConfig(),
    applications: useDesktopApplication(),
    services: servicesRegistry,
    hooks: useDesktopHooks(),
    ipc: useDesktopIPC(),
    windows: useDesktopWindow(),
    workspace: useDesktopWorkspaceStore(),
    defaultApps: useDesktopDefaultApps(),
    identity: useDesktopIdentity(),
    session: useDesktopSession(),
    commands: useDesktopCommands(),
    volume: useDesktopVolume(),
    notifications: useDesktopNotification(),
    tray: useDesktopTray(),

    ...extensions,
  }
}
