import { computed } from 'vue'
import { useDesktopStore } from '../stores/storeDesktop'
import { useDesktopDefaultAppsStore } from '../stores/storeDesktopDefaultApps'

/**
 * Desktop Default Apps composable (singleton pattern via Pinia).
 * Exposes default-app routing for features like terminal, browser, editor.
 */
export function useDesktopDefaultApps() {
  const desktopStore = useDesktopStore()
  const defaultAppsStore = useDesktopDefaultAppsStore()

  /** Map of feature name → default app handler (e.g. terminal, browser). */
  const defaultApps = computed(
    () => desktopStore.state.defaultApps,
  )

  function getDefaultApp(feature: string) {
    return defaultAppsStore.getDefaultApp(feature)
  }

  function setDefaultApp(
    feature: string,
    application: IApplicationController,
    entry: string,
  ) {
    defaultAppsStore.setDefaultApp(feature, application, entry)
  }

  return {
    defaultApps,
    getDefaultApp,
    setDefaultApp,
  }
}
