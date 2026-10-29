import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin({
  name: 'desktop-register-desktop-apps',
  dependsOn: ['pinia', 'desktop-shell-init'],
  setup() {
    // Client hook placeholder for built-in / dynamic desktop application registration
  },
})
