import { markRaw, reactive, shallowRef } from 'vue'
import { createActor } from 'xstate'
import { nanoid } from 'nanoid'
import {
  applicationMachine,
  computeSnapRect,
  type ApplicationConfig,
  type CommandOutput,
  type WindowConfig,
  type WindowLayout,
  type WindowStoredState,
} from '@owdproject/core'
import { WindowController } from './WindowController'
import type { IApplicationController, IWindowController } from '../../../types'
import { apps } from '../../composables/application/state'
import { useDesktopCommands } from '../../composables/useDesktopCommands'
import { useDesktopDefaultApps } from '../../composables/useDesktopDefaultApps'
import { useDesktopHooks } from '../../composables/useDesktopHooks'
import { useDesktopIPC } from '../../composables/useDesktopIPC'
import { useDesktopStore } from '../../stores/storeDesktop'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import { useApplicationWindowsStore } from '../../stores/storeApplicationWindows'
import { useApplicationMetaStore } from '../../stores/storeApplicationMeta'

let globalPidCounter = 1000

function formatAppSnapshotValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length > 0) {
      const [k, v] = entries[0]!
      return `${k}.${formatAppSnapshotValue(v)}`
    }
  }
  return 'idle'
}

export class ApplicationController implements IApplicationController {
  public readonly id: string
  public readonly config: ApplicationConfig
  public readonly windows = new Map<string, IWindowController>()
  public readonly openWindowCount = shallowRef<number>(0)

  public storeWindows: ReturnType<typeof useApplicationWindowsStore> | undefined
  public storeMeta: any

  private readonly _pid = shallowRef<number | null>(null)
  private readonly _startedAt = shallowRef<number | null>(null)
  private readonly _stateValue = shallowRef<string>('idle')
  private readonly _isRunning = shallowRef<boolean>(false)
  private readonly _isSuspended = shallowRef<boolean>(false)

  private appActor: any

  constructor(id: string, config: ApplicationConfig) {
    this.id = id
    this.config = config

    this.appActor = createActor(applicationMachine, {
      input: {
        id,
        config,
      },
    })

    this.appActor.subscribe((snapshot: any) => {
      const stateStr = formatAppSnapshotValue(snapshot.value)
      const prevRunning = this._isRunning.value
      const nextRunning = snapshot.matches('running')
      const nextSuspended = snapshot.matches({ running: 'suspended' })

      this._stateValue.value = stateStr
      this._isRunning.value = nextRunning
      this._isSuspended.value = nextSuspended

      if (nextRunning && !prevRunning) {
        if (!this._pid.value) {
          globalPidCounter += 1
          this._pid.value = globalPidCounter
          this._startedAt.value = Date.now()
        }
        void useDesktopHooks().callHook('app:launched', {
          app: this,
          pid: this._pid.value,
        })
        useDesktopIPC().emit(
          'process:launched',
          { id: this.id, title: this.config.title, pid: this._pid.value },
          { source: 'kernel', severity: 'info' },
        )
      }

      if (snapshot.matches('terminating')) {
        const oldPid = this._pid.value
        this._pid.value = null
        this._startedAt.value = null
        this._isRunning.value = false
        this._isSuspended.value = false

        try {
          void this.config.onClose?.(this)
        } catch {
          // ignore
        }

        this.appActor.send({ type: 'TERMINATED' })

        void useDesktopHooks().callHook('app:terminated', {
          id: this.id,
          title: this.config.title,
          pid: oldPid,
        })
        useDesktopIPC().emit(
          'process:terminated',
          { id: this.id, title: this.config.title, pid: oldPid },
          { source: 'kernel', severity: 'warn' },
        )
      }
    })

    this.appActor.start()
  }

  get windowsOpened(): Map<string, IWindowController> {
    return this.windows
  }

  public getFirstWindowByModel(model: string): IWindowController | undefined {
    for (const window of this.windows.values()) {
      if (window.model === model) return window
    }
    return undefined
  }

  get pid(): number | null {
    return this._pid.value
  }

  get startedAt(): number | null {
    return this._startedAt.value
  }

  get stateValue(): string {
    return this._stateValue.value
  }

  get isRunning(): boolean {
    return this._isRunning.value
  }

  get isSuspended(): boolean {
    return this._isSuspended.value
  }

  get isInitializing(): boolean {
    return this._stateValue.value === 'initializing'
  }

  get isReady(): boolean {
    return this._stateValue.value === 'ready'
  }

  public async initApplication(): Promise<void> {
    this.appActor.send({ type: 'LAUNCH' })

    try {
      this.storeWindows = useApplicationWindowsStore(this.id)
      const metaFactory = useApplicationMetaStore(this.id)
      this.storeMeta = metaFactory()

      // Register CLI commands
      const commandsService = useDesktopCommands()
      if (this.config.commands) {
        for (const cmdName of Object.keys(this.config.commands)) {
          const termMeta = this.config.terminal?.[cmdName]
          commandsService.register({
            name: cmdName,
            applicationId: this.id,
            description: termMeta?.description ?? this.config.description,
            usage: termMeta?.usage ?? cmdName,
            args: termMeta?.args,
            options: termMeta?.options,
          })
        }
      }

      // Register default app provides if configured
      if (this.config.provides) {
        const defaultApps = useDesktopDefaultApps()
        defaultApps.setDefaultApp(
          this.config.provides.name,
          this,
          this.config.provides.entry,
        )
      }

      this.appActor.send({ type: 'INITIALIZED' })
      await this.config.onReady?.(this)
    } catch (err) {
      this.appActor.send({ type: 'INIT_FAILED' })
      console.error(`[@owdproject/nuxt] Failed to init app "${this.id}":`, err)
    }
  }

  public focusWindow(targetWin: IWindowController): void {
    const desktopStore = useDesktopStore()
    let previousFocused: IWindowController | undefined

    for (const app of apps.values()) {
      for (const win of app.windows.values()) {
        if (win.state.id !== targetWin.state.id && win.state.focused) {
          previousFocused = win
          win.setFocus(false)
          void useDesktopHooks().callHook('window:blurred', { window: win })
        }
      }
    }

    const nextZ = desktopStore.incrementPositionZ()
    if (!targetWin.state.position) {
      targetWin.state.position = { x: 100, y: 80, z: nextZ }
    } else {
      targetWin.state.position.z = nextZ
    }

    targetWin.setFocus(true)
    void useDesktopHooks().callHook('window:focused', {
      window: targetWin,
      previousWindow: previousFocused,
    })
  }

  public openWindow(
    model: string,
    storedState?: WindowStoredState,
    meta?: Record<string, any>,
  ): IWindowController | undefined {
    const modelConfig: WindowConfig | undefined = this.config.windows?.[model]
    if (!modelConfig) {
      console.warn(
        `[@owdproject/nuxt] Window model "${model}" is not defined in app "${this.id}".`,
      )
      return undefined
    }

    // Singleton check: reuse existing window if already open
    if (this.config.singleton && this.windows.size > 0) {
      const existing =
        Array.from(this.windows.values()).find((w) => w.model === model) ??
        Array.from(this.windows.values())[0]!

      if (meta && existing.meta && typeof existing.meta === 'object') {
        Object.assign(existing.meta, meta)
      }

      const workspaceStore = useDesktopWorkspaceStore()
      if (existing.state.workspace && existing.state.workspace !== workspaceStore.active) {
        workspaceStore.setWorkspace(existing.state.workspace)
      }

      existing.actions.setActive(true)
      existing.actions.bringToFront()
      return existing
    }

    const openCtx = {
      app: this,
      model,
      config: { ...modelConfig },
      meta,
      cancel: false,
    }
    void useDesktopHooks().callHook('window:before-open', openCtx)
    if (openCtx.cancel) {
      return undefined
    }

    const desktopStore = useDesktopStore()
    const workspaceStore = useDesktopWorkspaceStore()
    const cascadeIndex = this.windows.size
    const cascadeOffset = cascadeIndex * 28

    const baseX = openCtx.config.position?.x ?? 120
    const baseY = openCtx.config.position?.y ?? 90
    const windowId = storedState?.state?.id || `${this.id}-${model}-${nanoid(6)}`

    const resolvedStoredState: WindowStoredState =
      storedState ??
      reactive<WindowStoredState>({
        model,
        meta: reactive({ ...(openCtx.meta ?? {}) }),
        state: {
          id: windowId,
          createdAt: Date.now(),
          category: openCtx.config.category ?? this.config.category,
          workspace: workspaceStore.active || 'workspace-1',
          position: {
            x: baseX + cascadeOffset,
            y: baseY + cascadeOffset,
            z: desktopStore.incrementPositionZ(),
          },
          size: {
            width: openCtx.config.size?.width ?? 520,
            height: openCtx.config.size?.height ?? 380,
            minWidth: openCtx.config.size?.minWidth,
            minHeight: openCtx.config.size?.minHeight,
            maxWidth: openCtx.config.size?.maxWidth,
            maxHeight: openCtx.config.size?.maxHeight,
          },
          focused: true,
          active: true,
          maximized: Boolean(openCtx.config.maximized),
          minimizable: openCtx.config.minimizable !== false,
          maximizable: openCtx.config.maximizable !== false,
          destroyable: openCtx.config.destroyable !== false,
          draggable: openCtx.config.draggable !== false,
          resizable: openCtx.config.resizable !== false,
          layout: openCtx.config.maximized ? 'maximize' : 'normal',
        },
      })

    const controller = new WindowController(
      this,
      model,
      openCtx.config,
      resolvedStoredState,
      {
        getWorkarea: () => workspaceStore.workarea,
      },
    ) as unknown as IWindowController

    // Enhance setLayout so non-maximize snap zones (left-half, right-half, etc.) also compute geometry
    const origSetLayout = controller.actions.setLayout
    const enhancedActions = {
      ...controller.actions,
      setLayout: (layout: WindowLayout) => {
        const ok = origSetLayout(layout)
        if (ok && layout !== 'normal' && layout !== 'maximize') {
          const workarea = workspaceStore.workarea
          const fallbackWorkarea =
            workarea.width > 0 && workarea.height > 0
              ? workarea
              : {
                  x: 0,
                  y: 48,
                  width: typeof window !== 'undefined' ? window.innerWidth : 1280,
                  height: typeof window !== 'undefined' ? window.innerHeight - 48 : 752,
                }
          const rect = computeSnapRect(layout, fallbackWorkarea)
          controller.actions.setPosition({ x: rect.x, y: rect.y })
          controller.actions.setSize({ width: rect.width, height: rect.height })
        }
        if (ok) {
          void useDesktopHooks().callHook('window:layout-change', {
            window: controller,
            layout,
          })
          useDesktopIPC().emit(
            'window:layout-change',
            { windowId: controller.state.id, title: controller.title, layout },
            { source: this.id, severity: 'info' },
          )
        }
        return ok
      },
    }
    ;(controller as any).actions = Object.freeze(enhancedActions)

    const rawWindow = markRaw(controller)
    this.windows.set(windowId, rawWindow)
    this.openWindowCount.value = this.windows.size
    this.storeWindows?.setWindowState(windowId, resolvedStoredState)

    this.appActor.send({ type: 'OPEN_WINDOW' })
    this.focusWindow(rawWindow)

    void useDesktopHooks().callHook('window:opened', {
      window: rawWindow,
      app: this,
    })
    useDesktopIPC().emit(
      'window:opened',
      {
        windowId,
        appId: this.id,
        title: rawWindow.title,
        workspace: rawWindow.state.workspace,
      },
      { source: this.id, severity: 'info' },
    )

    return rawWindow
  }

  public closeWindow(windowId: string): void {
    const win = this.windows.get(windowId)
    if (!win) return

    const closeCtx = {
      window: win,
      app: this,
      cancel: false,
    }
    void useDesktopHooks().callHook('window:before-close', closeCtx)
    if (closeCtx.cancel) return

    win.dispose()
    this.windows.delete(windowId)
    this.openWindowCount.value = this.windows.size
    this.storeWindows?.removeWindowState(windowId)

    this.appActor.send({ type: 'CLOSE_WINDOW' })

    void useDesktopHooks().callHook('window:closed', {
      windowId,
      app: this,
    })
    useDesktopIPC().emit(
      'window:closed',
      { windowId, appId: this.id },
      { source: this.id, severity: 'info' },
    )
  }

  public closeAllWindows(): void {
    for (const windowId of Array.from(this.windows.keys())) {
      this.closeWindow(windowId)
    }
    this.storeWindows?.clearWindows()
  }

  public setRunning(value: boolean): void {
    if (value) {
      if (!this.isRunning) {
        this.appActor.send({ type: 'LAUNCH' })
      }
    } else if (this.isRunning) {
      this.appActor.send({ type: 'CLOSE_APP' })
    }
  }

  public suspend(): void {
    if (!this.isRunning || this.isSuspended) return

    const ctx = {
      app: this,
      signal: 'SIGSTOP' as const,
      cancel: false,
    }
    void useDesktopHooks().callHook('app:before-suspend', ctx)
    if (ctx.cancel) return

    for (const win of this.windows.values()) {
      win.minimize()
    }
    this.appActor.send({ type: 'SIGSTOP' })

    void useDesktopHooks().callHook('app:suspended', { app: this })
    useDesktopIPC().emit(
      'process:suspended',
      { id: this.id, pid: this.pid },
      { source: 'kernel', severity: 'warn' },
    )
  }

  public resume(): void {
    if (!this.isRunning || !this.isSuspended) return

    const ctx = {
      app: this,
      signal: 'SIGCONT' as const,
      cancel: false,
    }
    void useDesktopHooks().callHook('app:before-resume', ctx)
    if (ctx.cancel) return

    this.appActor.send({ type: 'SIGCONT' })
    for (const win of this.windows.values()) {
      win.unminimize()
      win.focus()
    }

    void useDesktopHooks().callHook('app:resumed', { app: this })
    useDesktopIPC().emit(
      'process:resumed',
      { id: this.id, pid: this.pid },
      { source: 'kernel', severity: 'info' },
    )
  }

  public sendSignal(
    signal: 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT' = 'SIGTERM',
  ): void {
    if (signal === 'SIGSTOP') {
      this.suspend()
      return
    }
    if (signal === 'SIGCONT') {
      this.resume()
      return
    }

    const terminateCtx = {
      app: this,
      signal,
      cancel: false,
    }
    void useDesktopHooks().callHook('app:before-terminate', terminateCtx)
    if (terminateCtx.cancel && signal !== 'SIGKILL') {
      return
    }

    for (const win of this.windows.values()) {
      win.dispose()
    }
    this.windows.clear()
    this.openWindowCount.value = 0
    this.storeWindows?.clearWindows()

    this.appActor.send({ type: signal })
  }

  public async execCommand(command: string): Promise<CommandOutput | void> {
    return useDesktopCommands().exec(command)
  }
}
