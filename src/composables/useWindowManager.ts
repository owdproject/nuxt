import { shallowRef, computed, onScopeDispose, getCurrentScope, type ShallowRef, type ComputedRef } from 'vue'
import { WindowManager, type WindowInstance } from '@owdproject/core'

export function useWindowManager(manager: WindowManager = new WindowManager()): {
  windows: ShallowRef<WindowInstance[]>
  focused: ComputedRef<WindowInstance | undefined>
  manager: WindowManager
} {
  const windows = shallowRef<WindowInstance[]>(manager.getSnapshot())

  const unsubscribe = manager.subscribe((snapshot) => {
    windows.value = [...snapshot]
  })

  const focused = computed(() => windows.value.find((w) => w.state.focused))

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe()
    })
  }

  return {
    windows,
    focused,
    manager,
  }
}

export const useVueWindowManager = useWindowManager
