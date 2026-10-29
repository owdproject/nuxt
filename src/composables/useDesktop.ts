import {
  shallowRef,
  computed,
  onScopeDispose,
  getCurrentScope,
  type ShallowRef,
  type ComputedRef,
} from 'vue'
import {
  createDesktop,
  type Desktop,
  type DesktopOptions,
  type WindowInstance,
  type ApplicationInstance,
  type WorkspaceState,
  type DesktopCommand,
  type DesktopKernelEvent,
} from '@owdproject/core'

export function useDesktop(desktopOrOptions?: Desktop | DesktopOptions): {
  desktop: Desktop
  windows: ShallowRef<readonly WindowInstance[]>
  applications: ShallowRef<readonly ApplicationInstance[]>
  workspace: ShallowRef<WorkspaceState>
  commands: ShallowRef<readonly DesktopCommand[]>
  events: ShallowRef<readonly DesktopKernelEvent[]>
  focusedWindow: ComputedRef<WindowInstance | undefined>
} {
  const desktop =
    desktopOrOptions && 'windows' in desktopOrOptions
      ? desktopOrOptions
      : createDesktop(desktopOrOptions)

  const initial = desktop.getSnapshot()
  const windows = shallowRef<readonly WindowInstance[]>(initial.windows)
  const applications = shallowRef<readonly ApplicationInstance[]>(initial.applications)
  const workspace = shallowRef<WorkspaceState>(initial.workspace)
  const commands = shallowRef<readonly DesktopCommand[]>(initial.commands)
  const events = shallowRef<readonly DesktopKernelEvent[]>(initial.events)

  const unsubscribe = desktop.subscribe((snapshot) => {
    windows.value = snapshot.windows
    applications.value = snapshot.applications
    workspace.value = snapshot.workspace
    commands.value = snapshot.commands
    events.value = snapshot.events
  })

  const focusedWindow = computed(() => windows.value.find((w) => w.state.focused))

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe()
    })
  }

  return {
    desktop,
    windows,
    applications,
    workspace,
    commands,
    events,
    focusedWindow,
  }
}
