import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useDesktopVolumeStore = defineStore('desktop/volume', () => {
  const master = ref<number>(100)

  function setMasterVolume(value: number) {
    master.value = Math.max(0, Math.min(100, value))
  }

  return {
    master,
    setMasterVolume,
  }
})
