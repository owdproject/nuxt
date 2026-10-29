import type { Ref } from 'vue'
import { onScopeDispose, watch } from 'vue'
import {
  EMPTY_DESKTOP_WORKAREA,
  useDesktopWorkspaceStore,
} from '../stores/storeDesktopWorkspace'

function measureElement(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * Tracks the desktop shell stage rectangle (area under system bar, above dock).
 * When called with no arguments, returns the read-only workarea ref.
 * When passed a shellStageRef, also registers the resize observer to update the workarea.
 */
export function useDesktopWorkarea(
  shellStageRef?: Ref<HTMLElement | null | undefined>,
) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  if (!shellStageRef) {
    return desktopWorkspaceStore.workarea
  }

  let resizeObserver: ResizeObserver | null = null

  function refreshWorkarea() {
    const el = shellStageRef.value
    if (!el) {
      desktopWorkspaceStore.setWorkarea({ ...EMPTY_DESKTOP_WORKAREA })
      return
    }
    desktopWorkspaceStore.setWorkarea(measureElement(el))
  }

  function disconnectObserver() {
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  function observeStage(el: HTMLElement) {
    disconnectObserver()
    refreshWorkarea()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    resizeObserver = new ResizeObserver(() => refreshWorkarea())
    resizeObserver.observe(el)
  }

  watch(
    shellStageRef,
    (el) => {
      disconnectObserver()
      if (typeof HTMLElement !== 'undefined' && el instanceof HTMLElement) {
        observeStage(el)
      } else {
        desktopWorkspaceStore.setWorkarea({ ...EMPTY_DESKTOP_WORKAREA })
      }
    },
    { immediate: true },
  )

  watch(
    () => desktopWorkspaceStore.overview,
    (open) => {
      if (!open) {
        refreshWorkarea()
      }
    },
  )

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', refreshWorkarea)
    onScopeDispose(() => {
      window.removeEventListener('resize', refreshWorkarea)
      disconnectObserver()
    })
  } else {
    onScopeDispose(disconnectObserver)
  }

  return desktopWorkspaceStore.workarea
}
