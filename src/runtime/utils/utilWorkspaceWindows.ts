import type { IApplicationController, IWindowController } from '../../types'

export function collectWindowsOnWorkspace(
  appsIterable: Iterable<IApplicationController>,
  workspaceId: string,
  activeWorkspaceId: string,
): IWindowController[] {
  const result: IWindowController[] = []
  for (const app of appsIterable) {
    for (const win of app.windows.values()) {
      const ws = win.state.workspace || activeWorkspaceId
      if (ws === workspaceId) {
        result.push(win)
      }
    }
  }
  return result
}
