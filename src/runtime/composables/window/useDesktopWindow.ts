import { computed } from 'vue'
import { apps } from '../application/state'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import { useDesktopIPC } from '../useDesktopIPC'
import { useDesktopHooks } from '../useDesktopHooks'

/**
 * Shared singleton reactive window list across all applications.
 * Prevents allocating duplicate computed watchers when 200+ window components call useDesktopWindow().
 */
const sharedWindowList = computed<IWindowController[]>(() => {
  const windows: IWindowController[] = []
  for (const app of apps.values()) {
    if (!app.isRunning && app.openWindowCount.value === 0) {
      continue
    }
    for (const window of app.windows.values()) {
      windows.push(window)
    }
  }
  return windows
})

/**
 * Shared O(1) lookup index by windowId.
 */
const sharedWindowIndex = computed<Map<string, IWindowController>>(() => {
  const index = new Map<string, IWindowController>()
  for (const win of sharedWindowList.value) {
    index.set(win.state.id, win)
  }
  return index
})

const sharedFocusedWindow = computed<IWindowController | undefined>(() => {
  for (const win of sharedWindowList.value) {
    if (win.state.focused) {
      return win
    }
  }
  return undefined
})

export function useDesktopWindow() {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  const activeWorkspaceWindows = computed(() => {
    const activeWs = desktopWorkspaceStore.active
    return sharedWindowList.value.filter(
      (win) => !win.state.workspace || win.state.workspace === activeWs,
    )
  })

  /**
   * Highest z-index maximized & active window on the current workspace.
   * Used by DesktopCoreWindow for O(1) occlusion culling of windows completely covered behind it.
   */
  const topMaximizedWindow = computed<IWindowController | undefined>(() => {
    if (desktopWorkspaceStore.overview) return undefined
    let topWin: IWindowController | undefined
    let maxZ = -Infinity

    for (const win of activeWorkspaceWindows.value) {
      if (win.state.active !== false && win.state.maximized) {
        const z = win.position?.z ?? 0
        if (z > maxZ) {
          maxZ = z
          topWin = win
        }
      }
    }
    return topWin
  })

  function get(windowId: string): IWindowController | undefined {
    return sharedWindowIndex.value.get(windowId)
  }

  function tileWindows(
    mode: 'horizontal' | 'vertical' | 'grid' = 'horizontal',
    workspaceId?: string,
  ): number {
    const targetWs = workspaceId || desktopWorkspaceStore.active
    const visibleWindows = sharedWindowList.value.filter(
      (win) =>
        (!win.state.workspace || win.state.workspace === targetWs) &&
        win.state.active !== false,
    )

    if (visibleWindows.length === 0) return 0

    const workarea = desktopWorkspaceStore.workarea
    const areaX = workarea.width > 0 ? workarea.x : 0
    const areaY = workarea.height > 0 ? workarea.y : 48
    const areaW = workarea.width > 0 ? workarea.width : window.innerWidth
    const areaH = workarea.height > 0 ? workarea.height : window.innerHeight - 48
    const gap = 8

    const count = visibleWindows.length
    const { callHook } = useDesktopHooks()

    if (count === 1) {
      const win = visibleWindows[0]!
      win.actions.saveBoundsBeforeLayout()
      win.actions.setPosition({ x: areaX + gap, y: areaY + gap })
      win.actions.setSize({ width: areaW - gap * 2, height: areaH - gap * 2 })
      win.actions.bringToFront()
      void callHook('window:layout-change', { window: win, layout: 'normal' })
      return 1
    }

    if (mode === 'horizontal') {
      const colW = Math.floor((areaW - gap * (count + 1)) / count)
      visibleWindows.forEach((win, idx) => {
        win.actions.saveBoundsBeforeLayout()
        win.state.maximized = false
        const nextLayout = count === 2 ? (idx === 0 ? 'left-half' : 'right-half') : 'normal'
        win.state.layout = nextLayout
        win.actions.setPosition({
          x: areaX + gap + idx * (colW + gap),
          y: areaY + gap,
        })
        win.actions.setSize({
          width: colW,
          height: areaH - gap * 2,
        })
        void callHook('window:layout-change', { window: win, layout: nextLayout })
      })
    } else if (mode === 'vertical') {
      const rowH = Math.floor((areaH - gap * (count + 1)) / count)
      visibleWindows.forEach((win, idx) => {
        win.actions.saveBoundsBeforeLayout()
        win.state.maximized = false
        win.state.layout = 'normal'
        win.actions.setPosition({
          x: areaX + gap,
          y: areaY + gap + idx * (rowH + gap),
        })
        win.actions.setSize({
          width: areaW - gap * 2,
          height: rowH,
        })
        void callHook('window:layout-change', { window: win, layout: 'normal' })
      })
    } else {
      // Grid tiling
      const cols = Math.ceil(Math.sqrt(count))
      const rows = Math.ceil(count / cols)
      const cellW = Math.floor((areaW - gap * (cols + 1)) / cols)
      const cellH = Math.floor((areaH - gap * (rows + 1)) / rows)

      visibleWindows.forEach((win, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        win.actions.saveBoundsBeforeLayout()
        win.state.maximized = false
        win.state.layout = 'normal'
        win.actions.setPosition({
          x: areaX + gap + col * (cellW + gap),
          y: areaY + gap + row * (cellH + gap),
        })
        win.actions.setSize({
          width: cellW,
          height: cellH,
        })
        void callHook('window:layout-change', { window: win, layout: 'normal' })
      })
    }

    useDesktopIPC().emit(
      'window:tiled',
      {
        mode,
        count,
        workspace: targetWs,
      },
      { source: 'display-server', severity: 'info' },
    )

    return count
  }

  function minimizeAll(workspaceId?: string) {
    const targetWs = workspaceId || desktopWorkspaceStore.active
    for (const win of sharedWindowList.value) {
      if (!win.state.workspace || win.state.workspace === targetWs) {
        win.minimize()
      }
    }
  }

  function restoreAll(workspaceId?: string) {
    const targetWs = workspaceId || desktopWorkspaceStore.active
    for (const win of sharedWindowList.value) {
      if (!win.state.workspace || win.state.workspace === targetWs) {
        win.unminimize()
      }
    }
  }

  return {
    list: sharedWindowList,
    index: sharedWindowIndex,
    activeWorkspaceWindows,
    focused: sharedFocusedWindow,
    topMaximizedWindow,
    get,
    tileWindows,
    minimizeAll,
    restoreAll,
    close: (windowId: string) => {
      const window = get(windowId)
      window?.application.closeWindow(window.state.id)
    },
    closeAll: (appId?: string) => {
      if (appId) {
        const app = apps.get(appId)
        if (app) {
          app.closeAllWindows()
        }
      } else {
        for (const app of apps.values()) {
          app.closeAllWindows()
        }
      }
    },
  }
}

export const useDesktopWindows = useDesktopWindow
