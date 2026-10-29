<script setup lang="ts">
import { ref, provide, onMounted, computed, watch } from 'vue'
import { useAppConfig } from '#imports'
import { useDraggable, useEventListener } from '@vueuse/core'
import { handleWindowControllerProps } from '../../utils/utilWindowControllerAdapter'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import { useDesktopWorkspaceEdgeDrop } from '../../composables/workspace/useDesktopWorkspaceEdgeDrop'
import { useDesktopWindowSnapDrop } from '../../composables/window/useDesktopWindowSnapDrop'
import { useDesktopWindow } from '../../composables/window/useDesktopWindow'

const props = defineProps<{
  window?: IWindowController
  content?: WindowContent
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { topMaximizedWindow } = useDesktopWindow()
const { beginWindowDrag, endWindowDrag } = useDesktopWorkspaceEdgeDrop()
const { beginWindowSnapDrag, endWindowSnapDrag } = useDesktopWindowSnapDrop()

const emit = defineEmits([
  'resize:start',
  'resize:move',
  'resize:end',
  'drag:start',
  'drag:move',
  'drag:end',
  'close',
  'open',
  'blur',
  'focus',
  'minimize',
  'restore',
  'maximize',
  'unmaximize',
  'toggle-maximize',
])

const appConfig = useAppConfig()
const windowController: IWindowController = handleWindowControllerProps(
  props.window,
)

const isHovered = ref(false)
const isDragging = computed(() => !!windowController?.state?.dragging)
const isResizing = computed(() => !!windowController?.state?.resizing)

/**
 * Window Hibernation & Occlusion Culling:
 * Suspends layout/paint work when the window is minimized, on an inactive workspace,
 * or 100% occluded behind a higher-z maximized window on the active workspace.
 */
const isHibernated = computed(() => {
  if (!windowController?.state) return false
  if (windowController.state.active === false) return true

  if (!desktopWorkspaceStore.overview) {
    const winWorkspace = windowController.state.workspace
    if (winWorkspace && winWorkspace !== desktopWorkspaceStore.active) {
      return true
    }

    const topMax = topMaximizedWindow.value
    if (
      topMax &&
      topMax.state.id !== windowController.state.id &&
      (topMax.position?.z ?? 0) > (windowController.position?.z ?? 0)
    ) {
      return true
    }
  }

  return false
})

/**
 * Lazy Resize Handles:
 * Mount the 8 resize handle DOM nodes only when the window is focused, hovered, or actively resizing.
 * Saves ~16,000 DOM nodes when 2,000 windows are open simultaneously.
 */
const showResizeHandles = computed(() =>
  Boolean(
    windowController?.isResizable &&
      !desktopWorkspaceStore.overview &&
      !windowController?.state?.maximized &&
      !isHibernated.value &&
      (windowController?.state?.focused || isHovered.value || isResizing.value),
  ),
)

provide<IWindowController>('windowController', windowController)
provide<WindowContent>('windowContent', props.content ?? {})
provide('windowHibernated', isHibernated)

const windowRef = ref<HTMLElement | null>(null)
const dragHandleRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (windowController?.state?.focused) {
    windowController.actions.bringToFront()
  }

  // Find the draggable header element once mounted
  if (windowRef.value) {
    dragHandleRef.value = windowRef.value.querySelector('.desktop-window-nav__draggable') as HTMLElement
  }
})

// Setup VueUse useDraggable
const { x, y } = useDraggable(windowRef, {
  handle: dragHandleRef,
  initialValue: {
    x: windowController?.position?.x ?? 0,
    y: windowController?.position?.y ?? 0,
  },
  onStart(event) {
    if (!windowController?.isDraggable || desktopWorkspaceStore.overview || windowController?.state?.maximized) {
      return false // Disable drag if un-draggable, workspace overview is open, or maximized
    }
    onWindowPointerDown()
    windowController?.startDrag()

    beginWindowDrag(windowController.state.id)
    beginWindowSnapDrag(
      windowController.state.id,
      desktopWorkspaceStore.workarea,
      windowController.isMaximizable,
    )

    emit('drag:start', event)
  },
  onMove(position, event) {
    emit('drag:move', { left: position.x, top: position.y })
  },
  onEnd(position, event) {
    windowController?.stopDrag()

    if (!desktopWorkspaceStore.overview) {
      const snapped = endWindowSnapDrag(windowController)
      if (!snapped) {
        const moved = endWindowDrag(windowController)
        if (!moved) {
          windowController?.actions?.setPosition({
            x: position.x,
            y: position.y,
          })
          if (windowController.state.layout && windowController.state.layout !== 'normal') {
            windowController.actions.clearLayout()
          }
        }
      }
    } else {
      windowController?.actions?.setPosition({
        x: position.x,
        y: position.y,
      })
    }

    emit('drag:end', { left: position.x, top: position.y })
  }
})

// Sync XState/Pinia positioning back to useDraggable if updated externally (like snap or maximize)
watch(
  () => [
    windowController?.state?.position?.x ?? windowController?.position?.x,
    windowController?.state?.position?.y ?? windowController?.position?.y,
  ],
  ([posX, posY]) => {
    x.value = posX ?? 0
    y.value = posY ?? 0
  },
)

// Sizing reactivity
const width = ref<number | string>(windowController?.size?.width ?? 300)
const height = ref<number | string>(windowController?.size?.height ?? 200)

watch(
  () => [
    windowController?.state?.size?.width ?? windowController?.size?.width,
    windowController?.state?.size?.height ?? windowController?.size?.height,
  ],
  ([w, h]) => {
    width.value = w ?? 300
    height.value = h ?? 200
  },
  { immediate: true },
)

function onWindowPointerDown() {
  windowController?.actions?.setActive(true)
  windowController?.actions?.bringToFront()
}

// Custom Pointer Events 8-way resize logic
function startResize(e: PointerEvent, direction: string) {
  if (!windowController) return
  e.stopPropagation()
  e.preventDefault()

  onWindowPointerDown()
  windowController.startResize()
  emit('resize:start', e)

  const startX = e.clientX
  const startY = e.clientY
  const startWidth = windowRef.value ? windowRef.value.offsetWidth : (windowController.size.width as number ?? 300)
  const startHeight = windowRef.value ? windowRef.value.offsetHeight : (windowController.size.height as number ?? 200)
  const startLeft = windowController.position?.x ?? 0
  const startTop = windowController.position?.y ?? 0

  const minWidth = windowController.size.minWidth ?? 150
  const minHeight = windowController.size.minHeight ?? 150
  const maxWidth = windowController.size.maxWidth ?? Infinity
  const maxHeight = windowController.size.maxHeight ?? Infinity

  let currentLeft = startLeft
  let currentTop = startTop
  let currentWidth = startWidth
  let currentHeight = startHeight

  const cleanupMove = useEventListener(window, 'pointermove', (event: PointerEvent) => {
    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY

    let nextWidth = startWidth
    let nextHeight = startHeight
    let nextLeft = startLeft
    let nextTop = startTop

    if (direction.includes('e')) {
      nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    }
    if (direction.includes('w')) {
      const proposedWidth = startWidth - deltaX
      nextWidth = Math.max(minWidth, Math.min(maxWidth, proposedWidth))
      if (proposedWidth >= minWidth && proposedWidth <= maxWidth) {
        nextLeft = startLeft + deltaX
      }
    }
    if (direction.includes('s')) {
      nextHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY))
    }
    if (direction.includes('n')) {
      const proposedHeight = startHeight - deltaY
      nextHeight = Math.max(minHeight, Math.min(maxHeight, proposedHeight))
      if (proposedHeight >= minHeight && proposedHeight <= maxHeight) {
        nextTop = startTop + deltaY
      }
    }

    currentLeft = nextLeft
    currentTop = nextTop
    currentWidth = nextWidth
    currentHeight = nextHeight

    x.value = nextLeft
    y.value = nextTop
    width.value = nextWidth
    height.value = nextHeight

    emit('resize:move', { left: nextLeft, top: nextTop, width: nextWidth, height: nextHeight })
  })

  const cleanupUp = useEventListener(window, 'pointerup', (event: PointerEvent) => {
    cleanupMove()
    cleanupUp()

    windowController.actions.setPosition({
      x: currentLeft,
      y: currentTop,
    })

    windowController.actions.setSize({
      width: currentWidth,
      height: currentHeight,
    })

    windowController.stopResize()
    emit('resize:end', { left: currentLeft, top: currentTop, width: currentWidth, height: currentHeight })
  })
}

const classes = computed(() => {
  const list = ['desktop-window', 'resizable-component']

  if (windowController?.state.focused) {
    list.push('desktop-window--focused')
  }

  if (isDragging.value) {
    list.push('desktop-window--dragging')
  }

  if (isResizing.value) {
    list.push('desktop-window--resizing')
  }

  if (isHibernated.value) {
    list.push('desktop-window--hibernated')
  }

  return list
})

function onOverviewNativeDragStart(e: DragEvent) {
  if (!desktopWorkspaceStore.overview || !windowController) return
  e.stopPropagation()
  e.dataTransfer?.setData('text/plain', windowController.state.id)
  e.dataTransfer!.effectAllowed = 'move'
  try {
    const img = new Image()
    img.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer?.setDragImage(img, 0, 0)
  } catch {
    /* noop */
  }
}

const windowPositionMode = computed(
  () => appConfig.desktop?.windows?.position ?? 'fixed',
)
</script>

<template>
  <div
    ref="windowRef"
    :class="classes"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      zIndex: windowController?.position?.z,
      position: windowPositionMode
    }"
    :draggable="desktopWorkspaceStore.overview"
    :aria-hidden="isHibernated ? 'true' : undefined"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
    @pointerdown="onWindowPointerDown"
    @dragstart="onOverviewNativeDragStart"
  >
    <!-- 8-way Lazy Resize Handles (mounted only when focused, hovered, or resizing) -->
    <div v-if="showResizeHandles" class="window-resize-handles">
      <div class="resize-handle handle-t" @pointerdown.stop.prevent="startResize($event, 't')"></div>
      <div class="resize-handle handle-b" @pointerdown.stop.prevent="startResize($event, 'b')"></div>
      <div class="resize-handle handle-r" @pointerdown.stop.prevent="startResize($event, 'r')"></div>
      <div class="resize-handle handle-l" @pointerdown.stop.prevent="startResize($event, 'l')"></div>
      <div class="resize-handle handle-tl" @pointerdown.stop.prevent="startResize($event, 'tl')"></div>
      <div class="resize-handle handle-tr" @pointerdown.stop.prevent="startResize($event, 'tr')"></div>
      <div class="resize-handle handle-bl" @pointerdown.stop.prevent="startResize($event, 'bl')"></div>
      <div class="resize-handle handle-br" @pointerdown.stop.prevent="startResize($event, 'br')"></div>
    </div>

    <slot />
  </div>
</template>

<style scoped lang="scss">
.desktop-window {
  position: v-bind('windowPositionMode');
  box-sizing: border-box;
  /* Native CSS Containment: isolates layout, style, and paint calculations per window */
  contain: layout paint style;

  /* Relax paint containment on focused/hovered/resizing windows so -4px outer resize handles remain interactive */
  &--focused,
  &--resizing,
  &:hover {
    contain: layout style;
  }

  &--dragging,
  &--resizing {
    will-change: left, top, width, height;

    :deep(.desktop-window__content) {
      pointer-events: none;
    }
  }

  /* Window Hibernation / Occlusion Culling: skips layout & paint for minimized, off-workspace, or fully occluded windows */
  &--hibernated {
    content-visibility: hidden;
    pointer-events: none;
  }

  :deep(.desktop-window__content) {
    overflow-y: auto;
    height: 100%;
    min-height: 0;
    contain: layout paint style;
    content-visibility: auto;
  }
}

.window-resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
}

/* Borders */
.handle-t {
  top: -4px;
  left: 4px;
  right: 4px;
  height: 8px;
  cursor: ns-resize;
}
.handle-b {
  bottom: -4px;
  left: 4px;
  right: 4px;
  height: 8px;
  cursor: ns-resize;
}
.handle-r {
  right: -4px;
  top: 4px;
  bottom: 4px;
  width: 8px;
  cursor: ew-resize;
}
.handle-l {
  left: -4px;
  top: 4px;
  bottom: 4px;
  width: 8px;
  cursor: ew-resize;
}

/* Angles */
.handle-tl {
  top: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
  cursor: nwse-resize;
}
.handle-tr {
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  cursor: nesw-resize;
}
.handle-bl {
  bottom: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
  cursor: nesw-resize;
}
.handle-br {
  bottom: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  cursor: nwse-resize;
}
</style>
