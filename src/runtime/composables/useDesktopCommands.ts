import { useDesktopApplication } from './useDesktopApplication'
import { useDesktopWindow } from './window/useDesktopWindow'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopNotification } from './useDesktopNotification'
import { useDesktopIPC } from './useDesktopIPC'
import { useDesktopHooks } from './useDesktopHooks'
import { debugLog } from '../utils/utilDebug'

const commands = new Map<string, DesktopCommand>()
const systemBootTimestamp = Date.now()

// ─── formatting helpers ──────────────────────────────────────────────────────

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

const BUILTIN_COMMANDS: Array<{ name: string; description: string; usage: string }> = [
  { name: 'help', description: 'Show available kernel and application commands', usage: 'help [command]' },
  { name: 'ps', description: 'List all registered processes, PIDs, and XState states', usage: 'ps [-a]' },
  { name: 'open', description: 'Launch an application by ID or short name', usage: 'open <app-name>' },
  { name: 'kill', description: 'Send a signal (SIGTERM/SIGKILL/SIGSTOP/SIGCONT) to a PID or app', usage: 'kill [-s SIGNAL] <pid|app>' },
  { name: 'suspend', description: 'Suspend a running process (SIGSTOP)', usage: 'suspend <pid|app>' },
  { name: 'resume', description: 'Resume a suspended process (SIGCONT)', usage: 'resume <pid|app>' },
  { name: 'ws', description: 'List or switch virtual workspaces (1..4)', usage: 'ws [index]' },
  { name: 'tile', description: 'Tile open windows in active workspace (horizontal|vertical|grid)', usage: 'tile [horizontal|vertical|grid]' },
  { name: 'notify', description: 'Dispatch a desktop system notification', usage: 'notify <message>' },
  { name: 'ipc', description: 'Emit an IPC event or inspect recent kernel events', usage: 'ipc [emit <channel> <payload> | log]' },
  { name: 'uptime', description: 'Show Open Web Desktop uptime and active process count', usage: 'uptime' },
  { name: 'echo', description: 'Print arguments to standard output', usage: 'echo <text>' },
]

function buildHelpList(): string {
  const appCmds = Array.from(commands.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const allNames = [
    ...BUILTIN_COMMANDS.map((c) => c.name),
    ...appCmds.map((c) => c.name),
  ]
  const colWidth = Math.max(12, ...allNames.map((n) => n.length)) + 4

  const builtinRows = BUILTIN_COMMANDS.map(
    (cmd) => `  ${padEnd(cmd.name, colWidth)}${cmd.description}`,
  ).join('\n')

  const appRows = appCmds
    .map(
      (cmd) =>
        `  ${padEnd(cmd.name, colWidth)}${cmd.description ?? `Run ${cmd.name} (${cmd.applicationId})`}`,
    )
    .join('\n')

  return (
    `Open Web Desktop — Built-in Commands:\n` +
    builtinRows +
    (appRows ? `\n\nApplication Commands:\n${appRows}` : '') +
    `\n\nType 'help <command>' for usage details.`
  )
}

function buildHelpDetail(cmd: DesktopCommand): string {
  const lines: string[] = []

  lines.push(`  ${cmd.name}${cmd.description ? ` — ${cmd.description}` : ''}`)
  lines.push('')

  if (cmd.usage) {
    lines.push(`  Usage: ${cmd.usage}`)
    lines.push('')
  }

  if (cmd.args && cmd.args.length > 0) {
    lines.push('  Arguments:')
    const argColW = Math.max(...cmd.args.map((a) => a.name.length)) + 4
    for (const arg of cmd.args) {
      const required = arg.required ? '' : ' (optional)'
      lines.push(
        `    ${padEnd(arg.name, argColW)}${arg.description ?? ''}${required}`,
      )
    }
    lines.push('')
  }

  if (cmd.options && cmd.options.length > 0) {
    lines.push('  Options:')
    const optColW = Math.max(...cmd.options.map((o) => o.flag.length)) + 4
    for (const opt of cmd.options) {
      lines.push(`    ${padEnd(opt.flag, optColW)}${opt.description ?? ''}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

// ─── composable ─────────────────────────────────────────────────────────────

export function useDesktopCommands() {
  /**
   * Register a new command
   */
  const register = (command: DesktopCommand) => {
    commands.set(command.name, command)
    debugLog(`Registered command: ${command.name} → ${command.applicationId}`)
  }

  /**
   * List all registered command names
   */
  const list = (): string[] => {
    return [
      ...BUILTIN_COMMANDS.map((c) => c.name),
      ...Array.from(commands.keys()),
    ]
  }

  /**
   * Get a single command by name
   */
  const get = (name: string): DesktopCommand | undefined => {
    return commands.get(name)
  }

  /**
   * Get all registered commands with metadata
   */
  const all = (): DesktopCommand[] => {
    return Array.from(commands.values())
  }

  const runCommandInternal = async (
    trimmed: string,
    name: string,
    rest: string[],
  ): Promise<CommandOutput | void> => {
    const applications = useDesktopApplication()
    const windows = useDesktopWindow()
    const workspaceStore = useDesktopWorkspaceStore()
    const notifications = useDesktopNotification()
    const ipc = useDesktopIPC()

    // ── built-in: help ────────────────────────────────────────────────────────
    if (name === 'help') {
      const target = rest[0]

      if (!target) {
        return { message: buildHelpList() }
      }

      const builtin = BUILTIN_COMMANDS.find((c) => c.name === target)
      if (builtin) {
        return {
          message: `  ${builtin.name} — ${builtin.description}\n  Usage: ${builtin.usage}`,
        }
      }

      const cmd = commands.get(target)
      if (!cmd) {
        return {
          message: `help: command not found: '${target}'\nType 'help' to list available commands.`,
          isError: true,
        }
      }

      return { message: buildHelpDetail(cmd) }
    }

    // ── built-in: ps ──────────────────────────────────────────────────────────
    if (name === 'ps') {
      const procs = applications.processes.value
      const header = `  ${padEnd('PID', 8)}${padEnd('STATE', 20)}${padEnd('WIN', 6)}${padEnd('UPTIME', 12)}APPLICATION`
      const divider = `  ${'-'.repeat(72)}`
      const rows = procs.map((p) => {
        const pidStr = p.pid ? String(p.pid) : '-'
        const upStr = p.startedAt ? formatDuration(Date.now() - p.startedAt) : '-'
        return `  ${padEnd(pidStr, 8)}${padEnd(p.state, 20)}${padEnd(String(p.windowCount), 6)}${padEnd(upStr, 12)}${p.title} (${p.id})`
      })
      return {
        message: [header, divider, ...rows].join('\n'),
      }
    }

    // ── built-in: open ────────────────────────────────────────────────────────
    if (name === 'open') {
      const target = rest[0]
      if (!target) {
        return {
          message: `Usage: open <app-name>\nAvailable apps: ${applications.processes.value.map((p) => p.title.toLowerCase()).join(', ')}`,
          isError: true,
        }
      }
      try {
        await applications.launch(target, undefined, rest.slice(1).join(' '))
        const app = applications.resolveApp(target)
        return {
          message: `Launched ${app?.config.title ?? target} (PID ${app?.pid ?? 'active'})`,
        }
      } catch (err: any) {
        return {
          message: `open: ${err?.message ?? String(err)}`,
          isError: true,
        }
      }
    }

    // ── built-in: kill ────────────────────────────────────────────────────────
    if (name === 'kill') {
      let signal: 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT' = 'SIGTERM'
      let target = rest[0]
      if (target === '-9' || target === '-SIGKILL') {
        signal = 'SIGKILL'
        target = rest[1]
      } else if (target === '-s' && rest[1]) {
        const sig = rest[1].toUpperCase()
        if (sig === 'SIGKILL' || sig === 'SIGTERM' || sig === 'SIGSTOP' || sig === 'SIGCONT') {
          signal = sig
        }
        target = rest[2]
      }

      if (!target) {
        return {
          message: `Usage: kill [-9 | -s SIGNAL] <pid|app-id>`,
          isError: true,
        }
      }

      const app = applications.resolveApp(target)
      if (!app) {
        return {
          message: `kill: process '${target}' not found`,
          isError: true,
        }
      }

      const pid = app.pid
      applications.kill(target, signal)
      return {
        message: `Sent ${signal} to ${app.config.title} (${app.id}${pid ? `, PID ${pid}` : ''})`,
      }
    }

    // ── built-in: suspend & resume ────────────────────────────────────────────
    if (name === 'suspend') {
      const target = rest[0]
      if (!target) {
        return { message: 'Usage: suspend <pid|app>', isError: true }
      }
      const ok = applications.suspend(target)
      if (!ok) {
        return { message: `suspend: running process '${target}' not found`, isError: true }
      }
      return { message: `Suspended process '${target}' (SIGSTOP)` }
    }

    if (name === 'resume') {
      const target = rest[0]
      if (!target) {
        return { message: 'Usage: resume <pid|app>', isError: true }
      }
      const ok = applications.resume(target)
      if (!ok) {
        return { message: `resume: suspended process '${target}' not found`, isError: true }
      }
      return { message: `Resumed process '${target}' (SIGCONT)` }
    }

    // ── built-in: ws ──────────────────────────────────────────────────────────
    if (name === 'ws') {
      const arg = rest[0]
      const list = workspaceStore.list
      if (!arg) {
        const lines = list.map((id, idx) => {
          const activeMark = id === workspaceStore.active ? '*' : ' '
          const winCount = windows.list.value.filter((w) => w.state.workspace === id).length
          return `  ${activeMark} Workspace ${idx + 1} [${id}] — ${winCount} window(s)`
        })
        return { message: `Virtual Workspaces:\n${lines.join('\n')}` }
      }

      const idx = Number.parseInt(arg, 10) - 1
      if (Number.isNaN(idx) || idx < 0 || idx >= list.length) {
        return {
          message: `ws: invalid workspace index '${arg}'. Valid range: 1..${list.length}`,
          isError: true,
        }
      }
      const targetId = list[idx]!
      workspaceStore.setWorkspace(targetId)
      ipc.emit('workspace:switched', { index: idx + 1, workspaceId: targetId }, { source: 'cli' })
      return { message: `Switched to Workspace ${idx + 1} [${targetId}]` }
    }

    // ── built-in: tile ────────────────────────────────────────────────────────
    if (name === 'tile') {
      const modeArg = (rest[0] || 'horizontal').toLowerCase()
      const mode =
        modeArg === 'grid' || modeArg === 'vertical' ? modeArg : 'horizontal'
      const count = windows.tileWindows(mode)
      return {
        message:
          count > 0
            ? `Tiled ${count} active window(s) in '${mode}' layout.`
            : `No active windows in current workspace to tile.`,
      }
    }

    // ── built-in: notify ──────────────────────────────────────────────────────
    if (name === 'notify') {
      const body = rest.join(' ')
      if (!body) {
        return { message: 'Usage: notify <message>', isError: true }
      }
      notifications.add({
        title: 'System CLI Notification',
        body,
        icon: 'i-heroicons-command-line',
        appId: 'kernel.cli',
      })
      return { message: `Notification dispatched: "${body}"` }
    }

    // ── built-in: ipc ─────────────────────────────────────────────────────────
    if (name === 'ipc') {
      const sub = rest[0] || 'log'
      if (sub === 'emit') {
        const channel = rest[1]
        const payload = rest.slice(2).join(' ')
        if (!channel) {
          return { message: 'Usage: ipc emit <channel> [payload]', isError: true }
        }
        const evt = ipc.emit(channel, { message: payload || 'CLI ping' }, { source: 'cli' })
        return { message: `Emitted IPC event [${evt.id}] on channel '${channel}'` }
      }
      const recent = ipc.events.value.slice(0, 10)
      if (recent.length === 0) {
        return { message: 'No IPC kernel events recorded.' }
      }
      const lines = recent.map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString([], { hour12: false })
        return `  [${time}] ${padEnd(e.channel, 20)} (${e.source}) → ${JSON.stringify(e.payload ?? {})}`
      })
      return { message: `Recent Kernel IPC Events:\n${lines.join('\n')}` }
    }

    // ── built-in: uptime ──────────────────────────────────────────────────────
    if (name === 'uptime') {
      const up = formatDuration(Date.now() - systemBootTimestamp)
      const runningCount = applications.running.value.length
      const winCount = windows.list.value.length
      return {
        message: `Open Web Desktop up ${up} | ${runningCount} active process(es) | ${winCount} open window(s)`,
      }
    }

    // ── built-in: echo ────────────────────────────────────────────────────────
    if (name === 'echo') {
      return { message: rest.join(' ') }
    }

    // ── registered application commands ───────────────────────────────────────
    if (!commands.has(name)) {
      return {
        message: `Command not found: '${name}'\nType 'help' to list available commands.`,
        isError: true,
      }
    }

    const application = commands.get(name)!

    return applications.exec(application.applicationId, trimmed)
  }

  /**
   * Execute a command with Hookable interception (command:before-exec / command:after-exec)
   */
  const exec = async (input: string): Promise<CommandOutput | void> => {
    const trimmed = input.trim()
    const [name, ...rest] = trimmed.split(/\s+/)

    if (!name) return

    const { callHook } = useDesktopHooks()
    const execCtx = {
      input: trimmed,
      commandName: name,
      args: rest,
      cancel: false,
      overrideOutput: undefined as CommandOutput | undefined,
    }

    await callHook('command:before-exec', execCtx)
    if (execCtx.cancel) {
      return execCtx.overrideOutput
    }

    const output =
      execCtx.overrideOutput ??
      (await runCommandInternal(
        execCtx.input,
        execCtx.commandName,
        execCtx.args,
      ))

    await callHook('command:after-exec', {
      input: execCtx.input,
      commandName: execCtx.commandName,
      output,
    })

    return output
  }

  return {
    register,
    list,
    get,
    all,
    exec,

    // Retrocompatibility aliases for legacy apps (like app-terminal)
    addCommand: register,
    listCommands: list,
    getCommand: get,
    getAllCommands: all,
    execCommand: exec,
  }
}
