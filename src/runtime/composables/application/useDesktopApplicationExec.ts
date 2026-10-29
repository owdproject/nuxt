import * as shellwords from 'shellwords'
import getopts from 'getopts'
import { apps } from './state'

export function useDesktopApplicationExec() {
  async function exec(id: string, rawCommand: string): Promise<CommandOutput> {
    const app = apps.get(id)
    if (!app) {
      throw Error(`App "${id}" is not defined`)
    }

    const args = shellwords.split(rawCommand)
    const parsed = getopts(args)
    const command: string = parsed._[0] as string

    if (
      !app.config.commands ||
      !Object.prototype.hasOwnProperty.call(app.config.commands, command)
    ) {
      throw Error(
        `App command "${command}" is not defined in ${id} application`,
      )
    }

    const commandFn = app.config.commands[command]
    const commandOutput = await commandFn(app, parsed)

    app.setRunning(true)

    return commandOutput
  }

  return {
    exec,
  }
}
