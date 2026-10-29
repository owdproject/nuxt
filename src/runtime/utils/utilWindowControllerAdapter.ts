import { reactive } from 'vue'
import type { IWindowController, WindowLayout } from '../../types'

export function handleWindowControllerProps(
  windowProp?: IWindowController,
): IWindowController {
  if (windowProp) {
    return windowProp
  }

  const state = reactive({
    id: 'standalone-window',
    createdAt: Date.now(),
    workspace: 'workspace-1',
    position: { x: 80, y: 80, z: 10 },
    size: { width: 420, height: 320 },
    focused: true,
    active: true,
    maximized: false,
    minimizable: true,
    maximizable: true,
    destroyable: true,
    draggable: true,
    resizable: true,
    dragging: false,
    resizing: false,
    layout: 'normal' as WindowLayout,
  })

  const fallback: IWindowController = {
    application: undefined as any,
    instanced: false,
    model: 'standalone',
    stateValue: 'normal.focused.idle',
    config: {
      title: 'Window',
      size: { width: 420, height: 320 },
      position: { x: 80, y: 80, z: 10 },
    },
    override: {},
    state,
    meta: {},
    title: 'Window',
    windowTitle: 'Window',
    icon: undefined,
    size: state.size,
    position: state.position,
    isMinimizable: true,
    isMaximizable: true,
    isMaximized: false,
    isDestroyable: true,
    isDraggable: true,
    isResizable: true,
    menu: [],
    setMenu() {},
    dispose() {},
    destroy() {
      return false
    },
    startDrag() {
      state.dragging = true
    },
    stopDrag() {
      state.dragging = false
    },
    startResize() {
      state.resizing = true
    },
    stopResize() {
      state.resizing = false
    },
    actions: {
      setActive(v: boolean) {
        state.active = v
      },
      setFocus(v: boolean) {
        state.focused = v
      },
      bringToFront() {
        state.focused = true
      },
      focus() {
        state.focused = true
      },
      setPosition(pos: { x: number; y: number }) {
        state.position.x = pos.x
        state.position.y = pos.y
      },
      startDrag() {
        state.dragging = true
      },
      stopDrag() {
        state.dragging = false
      },
      startResize() {
        state.resizing = true
      },
      stopResize() {
        state.resizing = false
      },
      setSize(sz: { width: number; height: number }) {
        state.size.width = sz.width
        state.size.height = sz.height
      },
      minimize() {
        state.active = false
        return true
      },
      unminimize() {
        state.active = true
        return true
      },
      toggleMinimize() {
        state.active = !state.active
      },
      toggleMaximize() {
        state.maximized = !state.maximized
        return true
      },
      maximize() {
        state.maximized = true
        return true
      },
      unmaximize() {
        state.maximized = false
        return true
      },
      setLayout(layout: WindowLayout) {
        state.layout = layout
        return true
      },
      clearLayout() {
        state.layout = 'normal'
        return true
      },
      saveBoundsBeforeLayout() {},
      destroy() {
        return false
      },
      setWorkspace(ws: string) {
        state.workspace = ws
      },
      setTitleOverride() {},
      resetTitleOverride() {},
      setWindowTitleOverride() {},
      resetWindowTitleOverride() {},
    },
  }

  return fallback
}
