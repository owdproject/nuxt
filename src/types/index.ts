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
  /** Directories a desktop distribution collects extensions from (see {@link DesktopExtensionDirs}). */
  collect?: DesktopExtensionDirs
  [key: string]: any
}

/** Extension kinds a desktop distribution can collect. */
export type DesktopExtensionKind = 'app' | 'module' | 'theme' | 'kit'

/** Framework adapters an OWD extension can target (framework-first naming). */
export type DesktopFramework =
  | 'nuxt'
  | 'vue'
  | 'react'
  | 'svelte'
  | 'angular'
  | 'astro'

/**
 * Directories a desktop distribution collects extensions from, relative to its root.
 * Convention: one directory per extension kind. The monorepo keeps framework modules
 * under `packages/`, so the `modules` slot lists both.
 */
export interface DesktopExtensionDirs {
  apps: string[]
  modules: string[]
  themes: string[]
}

/**
 * Minimal declarative contract for a desktop extension. Published extensions surface
 * it through their Nuxt module `meta` (read at build time by `installDesktopPackage`),
 * so any framework desktop can classify the package without hard-coding package lists.
 *
 * Package naming convention: `<framework>-<kind>-<name>` (e.g. `@owdproject/nuxt-app-todo`,
 * `@owdproject/react-theme-win95`).
 */
export interface DesktopExtensionMeta {
  /** Extension kind. */
  kind: DesktopExtensionKind
  /** Framework the extension is built for. */
  framework: DesktopFramework
  /** Full package name, e.g. `@owdproject/nuxt-app-todo`. */
  packageName?: string
  /** Runtime namespace on `runtimeConfig.public.desktop[...]`. */
  configKey?: string
  /** Build-time entry (Nuxt module). Defaults to the package root export. */
  entry?: string
  /** Framework adapter required at runtime, e.g. `@owdproject/nuxt`. */
  adapter?: string
  /** Kits/modules the extension expects the active theme or desktop to provide. */
  requires?: string[]
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
