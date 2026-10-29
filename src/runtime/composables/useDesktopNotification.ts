import { toRef } from 'vue'
import { useDesktopNotificationStore } from '../stores/storeNotification'

export function useDesktopNotification() {
  const notificationStore = useDesktopNotificationStore()

  return {
    list: toRef(notificationStore, 'list'),
    add: notificationStore.add,
    remove: notificationStore.remove,
    clear: notificationStore.clear,
    markAsRead: notificationStore.markAsRead,
    markAllAsRead: notificationStore.markAllAsRead,
  }
}
