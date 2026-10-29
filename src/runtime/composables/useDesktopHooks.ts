import type { Hookable } from 'hookable'
import { globalDesktopHooks, type DesktopRuntimeHooks } from '@owdproject/core'
import type {
  DesktopAppDefineContext,
  DesktopAppLaunchContext,
  DesktopAppSignalContext,
  DesktopWindowOpenContext,
  DesktopWindowCloseContext,
  DesktopCommandExecContext,
  DesktopWorkspaceSwitchContext,
} from '@owdproject/core'

export type {
  DesktopRuntimeHooks,
  DesktopAppDefineContext,
  DesktopAppLaunchContext,
  DesktopAppSignalContext,
  DesktopWindowOpenContext,
  DesktopWindowCloseContext,
  DesktopCommandExecContext,
  DesktopWorkspaceSwitchContext,
}

type DesktopHookBus = Hookable<DesktopRuntimeHooks>
export interface DesktopHooksAPI {
  hooks: DesktopHookBus
  hook: DesktopHookBus['hook']
  hookOnce: DesktopHookBus['hookOnce']
  callHook: DesktopHookBus['callHook']
  callHookParallel: DesktopHookBus['callHookParallel']
  removeHook: DesktopHookBus['removeHook']
  removeAllHooks: DesktopHookBus['removeAllHooks']
}

export function useDesktopHooks(): DesktopHooksAPI {
  return {
    hooks: globalDesktopHooks,
    hook: globalDesktopHooks.hook.bind(globalDesktopHooks),
    hookOnce: globalDesktopHooks.hookOnce.bind(globalDesktopHooks),
    callHook: globalDesktopHooks.callHook.bind(globalDesktopHooks),
    callHookParallel: globalDesktopHooks.callHookParallel.bind(globalDesktopHooks),
    removeHook: globalDesktopHooks.removeHook.bind(globalDesktopHooks),
    removeAllHooks: globalDesktopHooks.removeAllHooks.bind(globalDesktopHooks),
  }
}
