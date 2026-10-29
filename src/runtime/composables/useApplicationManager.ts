import { computed } from 'vue'
import { apps } from './application/state'
import { useDesktopApplicationProcess } from './application/useDesktopApplicationProcess'
import { useDesktopApplicationExec } from './application/useDesktopApplicationExec'
import { useDesktopApplicationDefine } from './application/useDesktopApplicationDefine'
import { useDesktopApplicationRegistry } from './application/useDesktopApplicationRegistry'
import { useDesktopWindow } from './window/useDesktopWindow'

export function useApplicationManager() {
  const process = useDesktopApplicationProcess()
  const exec = useDesktopApplicationExec()
  const define = useDesktopApplicationDefine()
  const registry = useDesktopApplicationRegistry()
  const windowService = useDesktopWindow()

  return {
    defineApp: define.defineApp,
    isAppDefined: (id: string) => apps.has(id),
    getAppById: (id: string) => apps.get(id),
    isAppRunning: process.isRunning,
    launchAppEntry: process.launch,
    execAppCommand: exec.exec,
    closeApp: process.close,
    getWindowOpenedId: windowService.get,
    apps,
    appsEntries: registry.list,
    appsRunning: process.running,
    windowsOpened: windowService.index,
    appCategories: computed(() => Object.keys(registry.categories.value)),
    appsByCategory: registry.categories,
  }
}
