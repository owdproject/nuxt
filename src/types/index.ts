import type { Component, Raw, ShallowRef } from 'vue'
import type {
  WindowConfig as CoreWindowConfig,
  WindowState as CoreWindowState,
  WindowLayout,
  WindowPosition,
  WindowSize,
} from '@owdproject/core'

export * from '@owdproject/core'

export interface DesktopWindowConfig extends Omit<CoreWindowConfig, 'component'> {
  component?: Raw<Component> | any
}

export interface IDesktopWindowActions {
  setActive(value: boolean): void
  setFocus(value: boolean): void
  bringToFront(): void
  focus(): void
  setPosition(data: { x: number; y: number }): void
  startDrag(): void
  stopDrag(): void
  startResize(): void
  stopResize(): void
  setSize(data: { width: number; height: number }): void
  minimize(): boolean
  unminimize(): boolean
  toggleMinimize(): void
  toggleMaximize(): boolean
  maximize(): boolean
  unmaximize(): boolean
  setLayout(layout: WindowLayout): boolean
  clearLayout(): boolean
  saveBoundsBeforeLayout(): void
  destroy(): boolean
  setWorkspace(workspaceId: string): void
  setTitleOverride(value: undefined | string): void
  resetTitleOverride(): void
  setWindowTitleOverride(value: undefined | string): void
  resetWindowTitleOverride(): void
}

export interface IDesktopWindowController {
  application: any
  instanced: boolean
  model: string
  stateValue: string
  config: DesktopWindowConfig
  override: Record<string, any>
  state: CoreWindowState
  meta: any
  title: string
  windowTitle: string
  icon: string | undefined
  size: WindowSize
  position: WindowPosition | undefined
  isMinimizable: boolean
  isMaximizable: boolean
  isMaximized: boolean
  isDestroyable: boolean
  isDraggable: boolean
  isResizable: boolean
  actions: IDesktopWindowActions
  menu: any[]
  setMenu(menu: any[]): void
  dispose(): void
  destroy(): boolean
  startDrag(): void
  stopDrag(): void
  startResize(): void
  stopResize(): void
}

export type VueWindowConfig = DesktopWindowConfig
export type IVueWindowActions = IDesktopWindowActions
export type IVueWindowController = IDesktopWindowController

/** Desktop shell configuration, shared by inline options and desktop.config.ts. */
export interface DesktopConfig {
  theme?: string
  apps?: string[]
  modules?: string[]
  coreVersion?: string
  [key: string]: any
}

export interface IWindowController extends IDesktopWindowController {
  readonly application: IApplicationController
}
export type IWindowActions = IDesktopWindowActions
export interface IApplicationController {
  readonly id: string
  readonly config: import('@owdproject/core').ApplicationConfig
  readonly windows: Map<string, IWindowController>
  readonly windowsOpened: Map<string, IWindowController>
  readonly openWindowCount: ShallowRef<number>
  readonly storeWindows?: any
  readonly storeMeta?: any

  readonly pid: number | null
  readonly startedAt: number | null
  readonly stateValue: string

  readonly isRunning: boolean
  readonly isSuspended: boolean
  readonly isInitializing: boolean
  readonly isReady: boolean

  initApplication(): Promise<void>
  openWindow(
    model: string,
    storedState?: import('@owdproject/core').WindowStoredState,
    meta?: Record<string, any>,
  ): IWindowController | undefined
  getFirstWindowByModel(model: string): IWindowController | undefined
  closeWindow(windowId: string): void
  closeAllWindows(): void
  focusWindow(win: IWindowController): void

  setRunning(value: boolean): void
  suspend(): void
  resume(): void
  sendSignal(signal: 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT'): void
  execCommand(command: string): Promise<import('@owdproject/core').CommandOutput | void>
}


export interface DesktopSystemBarConfig { enabled?: boolean; position?: 'top' | 'bottom'; startButton?: boolean }
