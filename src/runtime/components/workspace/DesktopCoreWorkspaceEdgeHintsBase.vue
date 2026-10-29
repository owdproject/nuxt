<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopWorkspaceEdgeDrop } from '../../composables/workspace/useDesktopWorkspaceEdgeDrop'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'

const props = defineProps<{
  enabled?: boolean
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { edgeHint, edgeTargetDesktopIndex } = useDesktopWorkspaceEdgeDrop()

const visible = computed(
  () =>
    props.enabled !== false &&
    !desktopWorkspaceStore.overview &&
    desktopWorkspaceStore.list.length > 1 &&
    edgeHint.value !== null &&
    edgeTargetDesktopIndex.value !== null,
)
</script>

<template>
  <div
    v-if="visible"
    class="desktop-workspace-edge-hints"
    aria-hidden="true"
  >
    <div
      class="desktop-workspace-edge-hints__zone desktop-workspace-edge-hints__zone--left"
      :class="{
        'desktop-workspace-edge-hints__zone--active': edgeHint === 'left',
      }"
    >
      <slot
        name="left"
        :desktop-index="edgeTargetDesktopIndex"
        :side="'left' as const"
      />
    </div>
    <div
      class="desktop-workspace-edge-hints__zone desktop-workspace-edge-hints__zone--right"
      :class="{
        'desktop-workspace-edge-hints__zone--active': edgeHint === 'right',
      }"
    >
      <slot
        name="right"
        :desktop-index="edgeTargetDesktopIndex"
        :side="'right' as const"
      />
    </div>
  </div>
</template>

<style scoped>
.desktop-workspace-edge-hints {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999998;
}

.desktop-workspace-edge-hints__zone {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 72px;
  opacity: 0;
  transition: opacity 120ms ease;
}

.desktop-top-workspace-edge-hints__zone--left {
  left: 0;
}

.desktop-workspace-edge-hints__zone--right {
  right: 0;
}

.desktop-workspace-edge-hints__zone--active {
  opacity: 1;
}
</style>
