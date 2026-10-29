<script setup lang="ts">
import { useDesktop } from '../../composables/useDesktop'
defineProps<{
  workspaceFilter?: string
}>()

const { applications } = useDesktop()
const runningApps = applications.running
</script>

<template>
  <DesktopCoreApplicationWindowsRender
    v-for="app of runningApps"
    :key="app.id"
    :workspace-filter="workspaceFilter"
    :windows="app.windowsOpened"
    :window-revision="app.openWindowCount.value"
  />
</template>
