import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { DesktopTrayItem } from '../../types'

export const useDesktopTrayStore = defineStore('desktop/tray', () => {
  const items = ref<DesktopTrayItem[]>([])

  function registerIcon(item: DesktopTrayItem) {
    const existingIdx = items.value.findIndex((i) => i.id === item.id)
    if (existingIdx >= 0) {
      items.value[existingIdx] = item
    } else {
      items.value.push(item)
    }
  }

  function unregisterIcon(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  return {
    items,
    registerIcon,
    unregisterIcon,
  }
})
