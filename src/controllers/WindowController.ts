import { markRaw, reactive, shallowRef, defineAsyncComponent } from 'vue'
import { createActor } from 'xstate'
import {
  windowMachine,
  IframeGuard,
  type WindowConfig,
  type WindowLayout,
  type WindowOverride,
  type WindowSizeValue,
  type WindowState,
  type WindowStoredState,
} from '@owdproject/core'
import type { IDesktopWindowActions, IDesktopWindowController } from '../types'

function formatWindowSnapshotValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length > 0) {
      const [k, v] = entries[0]!
      return `${k}.${formatWindowSnapshotValue(v)}`
    }
  }
  return 'normal'
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  return JSON.parse(JSON.stringify(obj))
}

export class WindowController implements IDesktopWindowController {
  public readonly application: any
  public readonly instanced: boolean = true
  public readonly model: string

  private readonly _stateValue = shallowRef<string>('normal.focused.idle')

  get stateValue(): string {
    return this._stateValue.value
  }

  public config: WindowConfig = {
    title: '',
    category: '',
    component: undefined,
    position: { x: 0, y: 0, z: 0 },
    size: { width: undefined, height: undefined },
    minimizable: true,
    maximized: false,
    maximizable: true,
    destroyable: true,
    draggable: true,
    resizable: true,
  }

  public override: WindowOverride = reactive({})
  private storedState: WindowStoredState
  private windowActor: any
  private isDisposed = false

  public readonly actions: IDesktopWindowActions

  constructor(
    application: any,
    model: string,
    windowConfig: WindowConfig,
    windowStoredState: WindowStoredState,
    options?: {
      onFocus?: (win: WindowController) => void
      onLayoutChange?: (win: WindowController, layout: WindowLayout) => void
      getWorkarea?: () => { x: number; y: number; width: number; height: number }
      incrementPositionZ?: () => number
      getWindows?: () => WindowController[]
    },
  ) {
    this.application = application
    this.model = model
    this.storedState = windowStoredState

    this.setConfig(windowConfig)
    this.restoreState()

    this.actions = Object.freeze({
      setActive: this.setActive.bind(this),
      setFocus: this.setFocus.bind(this),
      bringToFront: this.focus.bind(this),
      focus: this.focus.bind(this),
      setPosition: this.setPosition.bind(this),
      startDrag: this.startDrag.bind(this),
      stopDrag: this.stopDrag.bind(this),
      startResize: this.startResize.bind(this),
      stopResize: this.stopResize.bind(this),
      setSize: this.setSize.bind(this),
      minimize: this.minimize.bind(this),
      unminimize: this.unminimize.bind(this),
      toggleMinimize: this.toggleMinimize.bind(this),
      toggleMaximize: this.toggleMaximize.bind(this),
      maximize: this.maximize.bind(this),
      unmaximize: this.unmaximize.bind(this),
      setLayout: this.setLayout.bind(this),
      clearLayout: this.clearLayout.bind(this),
      saveBoundsBeforeLayout: this.saveBoundsBeforeLayout.bind(this),
      destroy: this.destroy.bind(this),
      setWorkspace: this.setWorkspace.bind(this),
      setTitleOverride: this.setTitleOverride.bind(this),
      resetTitleOverride: this.resetTitleOverride.bind(this),
      setWindowTitleOverride: this.setWindowTitleOverride.bind(this),
      resetWindowTitleOverride: this.resetWindowTitleOverride.bind(this),
    })

    let initialValue: any = { normal: 'unfocused' }
    if (this.state.active === false) {
      initialValue = 'minimized'
    } else if (this.state.maximized === true) {
      initialValue = this.state.focused ? { maximized: 'focused' } : { maximized: 'unfocused' }
    } else if (this.state.focused === true) {
      initialValue = { normal: { focused: 'idle' } }
    }

    this.windowActor = createActor(windowMachine, {
      state: windowMachine.resolveState({
        value: initialValue,
        context: {
          wasMaximized: !!this.state.maximized,
          config: this.config,
        },
      }),
    })

    let wasLastMaximized = !!this.state.maximized

    this.windowActor.subscribe((snapshot: any) => {
      if (this.isDisposed) return

      this._stateValue.value = formatWindowSnapshotValue(snapshot.value)

      const isMinimized = snapshot.matches('minimized')
      const isMaximized = snapshot.matches('maximized')
      const isFocused =
        snapshot.matches('normal.focused') ||
        snapshot.matches('maximized.focused')

      const isDragging = snapshot.matches('normal.focused.dragging')
      const isResizing = snapshot.matches('normal.focused.resizing')

      if (this.state.active !== !isMinimized) this.state.active = !isMinimized
      if (this.state.maximized !== isMaximized) this.state.maximized = isMaximized
      if (this.state.focused !== isFocused) this.state.focused = isFocused
      if (this.state.dragging !== isDragging) this.state.dragging = isDragging
      if (this.state.resizing !== isResizing) this.state.resizing = isResizing

      if (isMaximized && !wasLastMaximized) {
        this.saveBoundsBeforeLayout()
        this.state.layout = 'maximize'

        const workarea = options?.getWorkarea?.()
        if (workarea && workarea.width > 0 && workarea.height > 0) {
          this.setPosition({ x: workarea.x, y: workarea.y })
          this.setSize({ width: workarea.width, height: workarea.height })
        }
      } else if (!isMaximized && wasLastMaximized) {
        if (this.state.layout === 'maximize') {
          this.clearLayout()
        }
      }

      wasLastMaximized = isMaximized
    })

    this.windowActor.start()
  }

  private setConfig(config: WindowConfig) {
    if (config.component) {
      this.config.component = markRaw(
        typeof config.component === 'function'
          ? defineAsyncComponent(config.component as any)
          : config.component,
      )
    }

    if (config.title) this.config.title = config.title
    if (config.icon) this.config.icon = config.icon

    if (!this.config.position) this.config.position = { x: 0, y: 0, z: 0 }
    if (config.position?.x !== undefined) this.config.position.x = config.position.x
    if (config.position?.y !== undefined) this.config.position.y = config.position.y
    if (config.position?.z !== undefined) this.config.position.z = config.position.z

    if (config.size?.width !== undefined) this.config.size.width = config.size.width
    if (config.size?.height !== undefined) this.config.size.height = config.size.height
    if (config.size?.minWidth !== undefined) this.config.size.minWidth = config.size.minWidth
    if (config.size?.minHeight !== undefined) this.config.size.minHeight = config.size.minHeight
    if (config.size?.maxWidth !== undefined) this.config.size.maxWidth = config.size.maxWidth
    if (config.size?.maxHeight !== undefined) this.config.size.maxHeight = config.size.maxHeight

    if (typeof config.resizable !== 'undefined') this.config.resizable = config.resizable
    if (typeof config.minimizable !== 'undefined') this.config.minimizable = config.minimizable
    if (typeof config.maximizable !== 'undefined') {
      this.config.maximizable = config.maximizable
    } else {
      this.config.maximizable = this.config.resizable !== false
    }

    if (typeof config.maximized !== 'undefined') this.config.maximized = config.maximized
    if (typeof config.draggable !== 'undefined') this.config.draggable = config.draggable
    if (typeof config.destroyable !== 'undefined') this.config.destroyable = config.destroyable

    const DEFAULT_OVERRIDABLE = {
      draggable: true,
      resizable: false,
      position: false,
      size: false,
      maximized: false,
      destroyable: false,
      minimizable: false,
      maximizable: false,
    }

    DEFAULT_OVERRIDABLE.position = DEFAULT_OVERRIDABLE.draggable
    DEFAULT_OVERRIDABLE.size = DEFAULT_OVERRIDABLE.resizable
    DEFAULT_OVERRIDABLE.maximized = DEFAULT_OVERRIDABLE.maximizable

    this.config.overridable = {
      ...DEFAULT_OVERRIDABLE,
      ...(config.overridable || {}),
    }
  }

  get state() {
    return this.storedState.state
  }

  private restoreState() {
    const overridable = this.config.overridable || {}

    for (const key in overridable) {
      if (overridable[key as keyof typeof overridable]) {
        const stateKey = key as keyof WindowState

        if (typeof this.state[stateKey] === 'undefined') {
          if (typeof this.config[stateKey] === 'object') {
            this.state[stateKey] = deepClone(this.config[stateKey])
          } else {
            this.state[stateKey] = !!this.config[stateKey]
          }
        }
      }
    }
  }

  get meta() {
    return this.storedState.meta
  }

  public setPosition(data: { x: number; y: number }) {
    if (!this.state.position) {
      this.state.position = { x: 0, y: 0 }
    }
    this.state.position.x = Math.round(data.x)
    this.state.position.y = Math.round(data.y)
  }

  public setActive(value: boolean) {
    if (this.isDisposed) return
    if (value) {
      this.windowActor.send({ type: 'RESTORE' })
    } else {
      this.windowActor.send({ type: 'MINIMIZE' })
    }
  }

  public setFocus(value: boolean) {
    if (this.isDisposed) return
    if (value) {
      if (!this.state.focused) {
        this.windowActor.send({ type: 'FOCUS' })
      }
    } else {
      if (this.state.focused) {
        this.windowActor.send({ type: 'BLUR' })
      }
    }
  }

  public focus() {
    if (this.isDisposed) return
    if (!this.state.position) {
      this.state.position = { x: 0, y: 0, z: 0 }
    }

    if (this.application?.focusWindow) {
      this.application.focusWindow(this)
    } else {
      this.setFocus(true)
    }
  }

  get title(): string {
    if (typeof this.override.title !== 'undefined') return this.override.title
    if (this.config.title) return this.config.title
    return this.application?.config?.title ?? ''
  }

  get windowTitle(): string {
    if (typeof this.override.windowTitle !== 'undefined') return this.override.windowTitle
    return this.title
  }

  get icon() {
    if (typeof this.override.icon !== 'undefined') return this.override.icon
    if (this.config.icon) return this.config.icon
    return this.application?.config?.icon
  }

  get position() {
    return this.state.position ?? this.config.position
  }

  get size() {
    const stateSize = this.state.size || {}
    const configSize = this.config.size || {}
    return {
      width: stateSize.width !== undefined ? stateSize.width : configSize.width,
      height: stateSize.height !== undefined ? stateSize.height : configSize.height,
      minWidth: stateSize.minWidth !== undefined ? stateSize.minWidth : configSize.minWidth,
      maxWidth: stateSize.maxWidth !== undefined ? stateSize.maxWidth : configSize.maxWidth,
      minHeight: stateSize.minHeight !== undefined ? stateSize.minHeight : configSize.minHeight,
      maxHeight: stateSize.maxHeight !== undefined ? stateSize.maxHeight : configSize.maxHeight,
    }
  }

  public setSize(data: { width: number; height: number }) {
    if (!this.state.size) {
      this.state.size = { width: undefined, height: undefined }
    }
    this.state.size.width = Math.round(data.width)
    this.state.size.height = Math.round(data.height)
  }

  get isMinimizable() {
    return this.config.overridable?.minimizable ? !!this.state.minimizable : !!this.config.minimizable
  }

  public minimize() {
    if (this.isDisposed || !this.isMinimizable) return false
    this.windowActor.send({ type: 'MINIMIZE' })
    return true
  }

  public unminimize() {
    if (this.isDisposed) return false
    this.windowActor.send({ type: 'RESTORE' })
    return true
  }

  public toggleMinimize() {
    if (this.isDisposed) return
    if (this.windowActor.getSnapshot().matches('minimized')) {
      this.unminimize()
      this.focus()
    } else if (this.state.focused) {
      this.minimize()
    } else {
      this.focus()
    }
  }

  get isMaximizable() {
    return this.state.maximizable !== undefined ? !!this.state.maximizable : !!this.config.maximizable
  }

  get isMaximized() {
    if (this.state.layout === 'maximize') return true
    return this.config.overridable?.maximized ? !!this.state.maximized : !!this.config.maximized
  }

  private parseSizeValue(value: WindowSizeValue | undefined, fallback: number): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (!Number.isNaN(parsed)) return parsed
    }
    return fallback
  }

  public saveBoundsBeforeLayout() {
    if (this.state.layout && this.state.layout !== 'normal') return
    const pos = this.position
    const size = this.size
    this.state.boundsBeforeLayout = {
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      width: this.parseSizeValue(size.width, 420),
      height: this.parseSizeValue(size.height, 320),
    }
  }

  public setLayout(layout: WindowLayout) {
    if (this.isDisposed) return false
    if (layout === 'normal') {
      this.windowActor.send({ type: 'RESTORE' })
      this.clearLayout()
      return true
    }
    if (!this.isMaximizable) return false

    if (layout === 'maximize') {
      this.windowActor.send({ type: 'MAXIMIZE' })
    } else {
      this.windowActor.send({ type: 'RESTORE' })
      this.saveBoundsBeforeLayout()
      this.state.layout = layout
    }
    return true
  }

  public clearLayout() {
    const bounds = this.state.boundsBeforeLayout
    if (bounds) {
      this.setPosition({ x: bounds.x, y: bounds.y })
      this.setSize({ width: bounds.width, height: bounds.height })
      delete this.state.boundsBeforeLayout
    }
    this.state.layout = 'normal'
    this.state.maximized = false
    return true
  }

  public toggleMaximize() {
    if (this.isDisposed || !this.isMaximizable) return false
    if (this.isMaximized) {
      this.windowActor.send({ type: 'RESTORE' })
    } else {
      this.windowActor.send({ type: 'MAXIMIZE' })
    }
    return true
  }

  public maximize() {
    if (this.isDisposed || !this.isMaximizable) return false
    this.windowActor.send({ type: 'MAXIMIZE' })
    return true
  }

  public unmaximize() {
    if (this.isDisposed || !this.isMaximizable) return false
    this.windowActor.send({ type: 'RESTORE' })
    return true
  }

  get isDestroyable() {
    return this.config.overridable?.destroyable ? !!this.state.destroyable : !!this.config.destroyable
  }

  public dispose() {
    if (this.isDisposed) return
    this.isDisposed = true
    try {
      this.windowActor.stop()
    } catch {
      // ignore
    }
  }

  public destroy() {
    if (!this.isDestroyable) return false
    if (!this.isDisposed) {
      this.windowActor.send({ type: 'DESTROY' })
    }
    this.application?.closeWindow?.(this.state.id)
    return true
  }

  get isDraggable() {
    return this.config.overridable?.draggable ? !!this.state.draggable : !!this.config.draggable
  }

  get isResizable() {
    return this.config.overridable?.resizable ? !!this.state.resizable : !!this.config.resizable
  }

  public setWorkspace(workspaceId: string) {
    this.state.workspace = workspaceId
  }

  public startDrag() {
    if (!this.isDisposed) {
      IframeGuard.enable()
      this.windowActor.send({ type: 'DRAG_START' })
    }
  }

  public stopDrag() {
    if (!this.isDisposed) {
      IframeGuard.disable()
      this.windowActor.send({ type: 'DRAG_END' })
    }
  }

  public startResize() {
    if (!this.isDisposed) {
      IframeGuard.enable()
      this.windowActor.send({ type: 'RESIZE_START' })
    }
  }

  public stopResize() {
    if (!this.isDisposed) {
      IframeGuard.disable()
      this.windowActor.send({ type: 'RESIZE_END' })
    }
  }

  public setTitleOverride(value: undefined | string) {
    this.override.title = value
  }

  public resetTitleOverride() {
    this.override.title = undefined
  }

  public setWindowTitleOverride(value: undefined | string) {
    this.override.windowTitle = value
  }

  public resetWindowTitleOverride() {
    this.override.windowTitle = undefined
  }

  public menu: any[] = []

  public setMenu(menu: any[]) {
    this.menu = menu
  }
}
