export interface DesktopDialogProvider {
  alert(message: string, title?: string): Promise<void>
  confirm(message: string, title?: string): Promise<boolean>
  prompt(
    message: string,
    defaultValue?: string,
    title?: string,
  ): Promise<string | null>
}

export function createBrowserFallbackDialogProvider(): DesktopDialogProvider {
  return {
    async alert(_message: string) {
      // No-op in non-interactive or iframe fallback environments
    },
    async confirm(_message: string) {
      return true
    },
    async prompt(_message: string, defaultValue = '') {
      return defaultValue
    },
  }
}
