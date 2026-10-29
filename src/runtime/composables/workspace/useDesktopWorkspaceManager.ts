import { useEventListener } from '@vueuse/core'
import { useDesktopWindow } from '../window/useDesktopWindow'
import { apps } from '../application/state'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import { collectWindowsOnWorkspace } from '../../utils/utilWorkspaceWindows'

/**
 * Keyboard + HTML5 drop handlers for workspace management (move windows between desktops).
 */
export function useDesktopWorkspaceManager() {
  const desktopWindow = useDesktopWindow()
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (!desktopWorkspaceStore.overview) return
    desktopWorkspaceStore.setOverview(false)
  })

  function onWorkspaceDragOver(e: DragEvent) {
    if (!desktopWorkspaceStore.overview) return
    e.preventDefault()
  }

  function onWorkspaceDrop(e: DragEvent, workspaceId: string) {
    e.preventDefault()
    if (!desktopWorkspaceStore.overview) return

    const raw =
      e.dataTransfer?.getData('text/plain') ||
      e.dataTransfer?.getData('text') ||
      ''
    if (!raw) return

    const windowInstance = desktopWindow.get(raw)
    windowInstance?.actions.setWorkspace(workspaceId)
  }

  /**
   * Remove a virtual desktop: migrate its windows to the last remaining workspace
   * (excluding the removed id), then drop the workspace from the list.
   */
  function removeWorkspace(workspaceId: string): boolean {
    if (desktopWorkspaceStore.list.length <= 2) return false

    const fallbackId = desktopWorkspaceStore.resolveWorkspaceFallback(workspaceId)
    if (!fallbackId) return false

    const activeId = desktopWorkspaceStore.active
    const windows = collectWindowsOnWorkspace(
      apps.values(),
      workspaceId,
      activeId,
    )

    for (const windowInstance of windows) {
      windowInstance.actions.setWorkspace(fallbackId)
    }

    return desktopWorkspaceStore.removeWorkspace(workspaceId)
  }

  return {
    onWorkspaceDragOver,
    onWorkspaceDrop,
    removeWorkspace,
  }
}
