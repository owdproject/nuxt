import { useDesktopCommands } from './useDesktopCommands'

// TODO: [DEPRECATED] Entire file useTerminalManager.ts can be deleted when no themes/apps depend on it.
/**
 * @deprecated Use useDesktopCommands instead
 */
export function useTerminalManager() {
  if (process.dev) {
    console.warn(
      '[@owdproject/nuxt] useTerminalManager() is deprecated. Please use useDesktopCommands() or useDesktop().commands instead.'
    )
  }
  return useDesktopCommands()
}
