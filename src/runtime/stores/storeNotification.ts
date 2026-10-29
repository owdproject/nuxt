import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { DesktopNotificationItem } from '../../types'
import { useDesktopIPC } from '../composables/useDesktopIPC'

let notificationCounter = 0

export const useDesktopNotificationStore = defineStore(
  'desktop/notification',
  () => {
    const list = ref<DesktopNotificationItem[]>([])

    function add(payload: {
      title: string
      body?: string
      icon?: string
      appId?: string
    }): DesktopNotificationItem {
      notificationCounter += 1
      const item: DesktopNotificationItem = {
        id: `notif-${Date.now()}-${notificationCounter}`,
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        appId: payload.appId,
        timestamp: Date.now(),
        read: false,
      }
      list.value = [item, ...list.value.slice(0, 99)]

      useDesktopIPC().emit(
        'notification:added',
        { id: item.id, title: item.title, appId: item.appId },
        { source: payload.appId || 'notification-store', severity: 'info' },
      )

      return item
    }

    function remove(id: string) {
      list.value = list.value.filter((item) => item.id !== id)
    }

    function clear() {
      list.value = []
    }

    function markAsRead(id: string) {
      const target = list.value.find((item) => item.id === id)
      if (target) {
        target.read = true
      }
    }

    function markAllAsRead() {
      for (const item of list.value) {
        item.read = true
      }
    }

    return {
      list,
      add,
      remove,
      clear,
      markAsRead,
      markAllAsRead,
    }
  },
)

export const useNotificationStore = useDesktopNotificationStore
