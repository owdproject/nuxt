import { shallowRef, onScopeDispose, getCurrentScope, type ShallowRef } from 'vue'
import type { WindowInstance, WindowState } from '@owdproject/core'

export function useWindowInstance(instance: WindowInstance): {
  state: ShallowRef<WindowState>
  instance: WindowInstance
} {
  const state = shallowRef<WindowState>(instance.getSnapshot())

  const unsubscribe = instance.subscribe((newSnapshot) => {
    state.value = newSnapshot
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe()
    })
  }

  return {
    state,
    instance,
  }
}
