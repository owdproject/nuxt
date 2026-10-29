import { computed } from 'vue'
import { useDesktopVolumeStore } from '../stores/storeDesktopVolume'

export function useDesktopVolume() {
  const volumeStore = useDesktopVolumeStore()

  return {
    master: computed(() => volumeStore.master),
    setMaster: volumeStore.setMasterVolume,
  }
}
