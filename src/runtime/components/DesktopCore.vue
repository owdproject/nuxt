<script setup lang="ts">
import { useAttrs, computed } from 'vue'
import { useAppConfig } from 'nuxt/app'

defineOptions({ inheritAttrs: false })

defineProps<{
  windows?: DesktopWindowsConfig
  systemBar?: DesktopSystemBarConfig
  dockBar?: DesktopDockBarConfig
  workspaces?: DesktopWorkspacesConfig
}>()

const appConfig = useAppConfig()
const attrs = useAttrs()

const classes = computed(() => {
  const list = ['desktop-shell']

  if (appConfig.desktop?.name) {
    list.push(`desktop-shell--${appConfig.desktop.name}`)
  }

  return list
})

const rootClass = computed(() => [classes.value, attrs.class])
const rootStyle = computed(() => attrs.style)
</script>

<template>
  <div :class="rootClass" :style="rootStyle">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.desktop-shell {
  width: 100vw;
  height: 100dvh;
  user-select: none;
  font-family: 'Plus Jakarta Sans', 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
