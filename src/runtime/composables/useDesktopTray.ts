import { computed } from 'vue'
import { useDesktopTrayStore } from '../stores/storeDesktopTray'

export function useDesktopTray() {
  const trayStore = useDesktopTrayStore()

  return {
    items: computed(() => trayStore.items),
    registerIcon: trayStore.registerIcon,
    unregisterIcon: trayStore.unregisterIcon,
  }
}
