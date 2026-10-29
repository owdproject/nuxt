<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import { useDesktopWindowSnapDrop } from '../../composables/window/useDesktopWindowSnapDrop'

const props = defineProps<{
  enabled?: boolean
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { snapHint, snapHintRect, isSnapDragActive } = useDesktopWindowSnapDrop()

const visible = computed(
  () =>
    props.enabled !== false &&
    !desktopWorkspaceStore.overview &&
    isSnapDragActive.value &&
    snapHint.value !== null &&
    snapHintRect.value !== null,
)

const hintStyle = computed(() => {
  const rect = snapHintRect.value
  if (!rect) return undefined

  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
})
</script>

<template>
  <div
    v-if="visible"
    class="desktop-window-snap-hints"
    aria-hidden="true"
  >
    <div
      class="desktop-window-snap-hints__zone"
      :class="`desktop-window-snap-hints__zone--${snapHint}`"
      :style="hintStyle"
    >
      <slot
        :zone="snapHint"
        :rect="snapHintRect"
      />
    </div>
  </div>
</template>

<style scoped>
.desktop-window-snap-hints {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999998;
}

.desktop-window-snap-hints__zone {
  position: fixed;
  box-sizing: border-box;
  border: 2px solid rgba(96, 165, 250, 0.85);
  background: rgba(96, 165, 250, 0.18);
  border-radius: 4px;
  transition:
    left 80ms ease,
    top 80ms ease,
    width 80ms ease,
    height 80ms ease;
}
</style>
