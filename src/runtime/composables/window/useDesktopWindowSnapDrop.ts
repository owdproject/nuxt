import type { DesktopWorkareaRect, IWindowController } from '../../../types'
import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import {
  detectSnapZone,
  type SnapZoneHint,
} from '../../utils/utilDetectSnapZone'
import { applySnapToWindow, computeSnapRect } from '../../utils/utilWindowLayout'
import { useDesktopWorkspaceEdgeDrop } from '../workspace/useDesktopWorkspaceEdgeDrop'

const snapHint = ref<SnapZoneHint | null>(null)
const isSnapDragActive = ref(false)
let snapDraggingWindowId: string | null = null
let activeWorkarea: DesktopWorkareaRect = { x: 0, y: 0, width: 0, height: 0 }

function onDocumentPointerMove(e: PointerEvent) {
  updateSnapHintFromPointer(e.clientX, e.clientY)
}

function onDocumentMouseMove(e: MouseEvent) {
  updateSnapHintFromPointer(e.clientX, e.clientY)
}

function stopSnapPointerTracking() {
  document.removeEventListener('pointermove', onDocumentPointerMove)
  document.removeEventListener('mousemove', onDocumentMouseMove)
}

function updateSnapHintFromPointer(clientX: number, clientY: number) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  if (!isSnapDragActive.value || desktopWorkspaceStore.overview) {
    snapHint.value = null
    return
  }

  const deferSide =
    desktopWorkspaceStore.list.length > 1 &&
    !desktopWorkspaceStore.overview

  snapHint.value = detectSnapZone(clientX, clientY, activeWorkarea, {
    deferSideSnapForWorkspaceEdge: deferSide,
  })
}

/**
 * While dragging a maximizable window, highlight snap zones in the shell work area.
 */
export function useDesktopWindowSnapDrop() {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  function beginWindowSnapDrag(
    windowId: string,
    workarea: DesktopWorkareaRect,
    maximizable: boolean,
  ) {
    if (desktopWorkspaceStore.overview) return
    if (!maximizable) return
    if (workarea.width <= 0 || workarea.height <= 0) return

    snapDraggingWindowId = windowId
    isSnapDragActive.value = true
    activeWorkarea = { ...workarea }
    snapHint.value = null

    document.addEventListener('pointermove', onDocumentPointerMove, {
      passive: true,
    })
    document.addEventListener('mousemove', onDocumentMouseMove, {
      passive: true,
    })
  }

  function commitSnapDrop(win: IWindowController): boolean {
    const zone = snapHint.value
    if (!zone || !snapDraggingWindowId) return false

    return applySnapToWindow(win, zone, activeWorkarea)
  }

  function endWindowSnapDrag(win: IWindowController): boolean {
    stopSnapPointerTracking()

    let snapped = false
    if (isSnapDragActive.value && snapHint.value) {
      snapped = commitSnapDrop(win)
    }

    isSnapDragActive.value = false
    snapDraggingWindowId = null
    snapHint.value = null

    return snapped
  }

  const snapHintRect = computed(() => {
    const zone = snapHint.value
    if (!zone || activeWorkarea.width <= 0) return null

    return computeSnapRect(zone, activeWorkarea)
  })

  return {
    snapHint,
    snapHintRect,
    isSnapDragActive,
    beginWindowSnapDrag,
    endWindowSnapDrag,
    activeWorkarea: () => activeWorkarea,
  }
}
