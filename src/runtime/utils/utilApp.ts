import type { ApplicationConfig } from '../../types'

export function normalizeApplicationConfig(
  config: ApplicationConfig,
): ApplicationConfig {
  return {
    ...config,
    entries: config.entries ?? {},
    windows: config.windows ?? {},
    commands: config.commands ?? {},
    terminal: config.terminal ?? {},
  }
}
