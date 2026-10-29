import { defineStore } from 'pinia'
import { useDesktopStore } from './storeDesktop'
import type { IApplicationController } from '../../types'

export const useDesktopDefaultAppsStore = defineStore(
  'desktop/default-apps',
  () => {
    const desktopStore = useDesktopStore()

    function getDefaultApp(feature: string) {
      return desktopStore.state.defaultApps[feature]
    }

    function setDefaultApp(
      feature: string,
      application: IApplicationController,
      entry: string,
    ) {
      desktopStore.state.defaultApps[feature] = {
        applicationId: application.id,
        entry,
      }
    }

    return {
      getDefaultApp,
      setDefaultApp,
    }
  },
)
