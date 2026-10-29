import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { WindowStoredState } from '../../types'

const windowsStoreRegistry = new Map<string, ReturnType<typeof defineStore>>()

export function applicationWindowsStoreId(appId: string): string {
  return `desktop/application/${appId}/windows`
}

export function useApplicationWindowsStore(appId: string) {
  let storeFactory = windowsStoreRegistry.get(appId)

  if (!storeFactory) {
    storeFactory = defineStore(applicationWindowsStoreId(appId), () => {
      const windows = reactive<Record<string, WindowStoredState>>({})

      function setWindowState(windowId: string, stored: WindowStoredState) {
        windows[windowId] = stored
      }

      function removeWindowState(windowId: string) {
        delete windows[windowId]
      }

      function clearWindows() {
        for (const key of Object.keys(windows)) {
          delete windows[key]
        }
      }

      return {
        windows,
        setWindowState,
        removeWindowState,
        clearWindows,
      }
    })
    windowsStoreRegistry.set(appId, storeFactory)
  }

  return storeFactory()
}
