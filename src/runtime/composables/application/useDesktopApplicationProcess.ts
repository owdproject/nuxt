import { computed } from 'vue'
import { apps } from './state'
import { useDesktopApplicationExec } from './useDesktopApplicationExec'
import { useDesktopHooks } from '../useDesktopHooks'

/**
 * Shared singleton reactive process computeds for O(1) watcher overhead across 200+ apps.
 */
const sharedRunningApps = computed<IApplicationController[]>(() => {
  const runningApps: IApplicationController[] = []
  for (const app of apps.values()) {
    const openCount = app.openWindowCount.value
    if (app.isRunning || openCount > 0) {
      runningApps.push(app)
    }
  }
  return runningApps
})

const sharedProcesses = computed(() => {
  const allProcesses: Array<{
    id: string
    title: string
    icon?: string
    category?: string
    pid: number | null
    state: string
    isRunning: boolean
    isSuspended: boolean
    windowCount: number
    startedAt: number | null
    controller: IApplicationController
  }> = []

  for (const app of apps.values()) {
    allProcesses.push({
      id: app.id,
      title: app.config.title,
      icon: app.config.icon,
      category: app.config.category,
      pid: app.pid,
      state: app.stateValue,
      isRunning: app.isRunning,
      isSuspended: app.isSuspended,
      windowCount: app.openWindowCount.value,
      startedAt: app.startedAt,
      controller: app,
    })
  }

  return allProcesses.sort((a, b) => {
    if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1
    return (a.pid ?? 99999) - (b.pid ?? 99999)
  })
})

export function useDesktopApplicationProcess() {
  const { exec } = useDesktopApplicationExec()

  function isRunning(id: string | undefined): boolean {
    if (!id) return false
    const app = apps.get(id)
    return !!app?.isRunning
  }

  function findByPid(pid: number): IApplicationController | undefined {
    for (const app of apps.values()) {
      if (app.pid === pid) {
        return app
      }
    }
    return undefined
  }

  function resolveApp(idOrPid: string | number): IApplicationController | undefined {
    if (typeof idOrPid === 'number') {
      return findByPid(idOrPid)
    }
    const asNumber = Number(idOrPid)
    if (!Number.isNaN(asNumber) && String(asNumber) === idOrPid.trim()) {
      const byPid = findByPid(asNumber)
      if (byPid) return byPid
    }
    if (apps.has(idOrPid)) {
      return apps.get(idOrPid)
    }
    const lower = idOrPid.toLowerCase()
    for (const app of apps.values()) {
      if (
        app.id.toLowerCase() === lower ||
        app.id.toLowerCase().endsWith(`.${lower}`) ||
        app.config.title.toLowerCase() === lower
      ) {
        return app
      }
    }
    return undefined
  }

  async function launch(id: string, entryKey?: string, argument = '') {
    const app = resolveApp(id)
    if (!app) {
      throw Error(`App "${id}" is not defined`)
    }

    const { callHook } = useDesktopHooks()
    const beforeLaunchCtx = {
      app,
      entryKey,
      argument,
      cancel: false,
    }
    await callHook('app:before-launch', beforeLaunchCtx)
    if (beforeLaunchCtx.cancel) {
      return
    }

    const entries = app.config.entries || {}
    const resolvedKey = beforeLaunchCtx.entryKey || Object.keys(entries)[0]

    if (!resolvedKey || !entries.hasOwnProperty(resolvedKey)) {
      if (app.config.windows && Object.keys(app.config.windows).length > 0) {
        const firstModel = Object.keys(app.config.windows)[0]!
        return app.openWindow(firstModel)
      }
      throw Error(`App entry "${resolvedKey}" is not defined in ${app.id} application`)
    }

    const entry = entries[resolvedKey]!
    const finalArg = beforeLaunchCtx.argument ?? argument
    const suffix = finalArg ? ` ${finalArg}` : ''

    await exec(app.id, entry.command + suffix)
  }

  function suspend(idOrPid: string | number): boolean {
    const app = resolveApp(idOrPid)
    if (!app || !app.isRunning) return false
    app.suspend()
    return true
  }

  function resume(idOrPid: string | number): boolean {
    const app = resolveApp(idOrPid)
    if (!app || !app.isRunning) return false
    app.resume()
    return true
  }

  function kill(
    idOrPid: string | number,
    signal: 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT' = 'SIGTERM',
  ): boolean {
    const app = resolveApp(idOrPid)
    if (!app) return false
    app.sendSignal(signal)
    return true
  }

  function close(id: string) {
    const app = resolveApp(id)
    if (!app) {
      throw Error(`App "${id}" is not defined`)
    }

    app.closeAllWindows()
    app.setRunning(false)
  }

  return {
    running: sharedRunningApps,
    processes: sharedProcesses,
    isRunning,
    findByPid,
    resolveApp,
    launch,
    suspend,
    resume,
    kill,
    close,
  }
}
