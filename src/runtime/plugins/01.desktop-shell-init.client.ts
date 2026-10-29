import { defineNuxtPlugin } from 'nuxt/app'
import { useDesktopStore } from '../stores/storeDesktop'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopVolumeStore } from '../stores/storeDesktopVolume'
import { useDesktopNotificationStore } from '../stores/storeNotification'
import { useDesktopTrayStore } from '../stores/storeDesktopTray'

export default defineNuxtPlugin({
  name: 'desktop-shell-init',
  dependsOn: ['pinia'],
  setup() {
    if (import.meta.server) return

    useDesktopStore()
    useDesktopWorkspaceStore()
    useDesktopVolumeStore()
    useDesktopNotificationStore()
    useDesktopTrayStore()
  },
})
