import { computed } from 'vue'
import { useDesktopConfig } from './useDesktopConfig'

export function useHasDesktopModule(pkg: string) {
  const desktop = useDesktopConfig()
  return computed(() => desktop.value?.modules?.includes(pkg) ?? false)
}

export function useHasDesktopApp(pkg: string) {
  const desktop = useDesktopConfig()
  return computed(() => desktop.value?.apps?.includes(pkg) ?? false)
}

export function useHasDesktopExtension(key: string) {
  const desktop = useDesktopConfig()
  return computed(() => Boolean(desktop.value?.[key as keyof typeof desktop.value]))
}

// Backward-compatible aliases
export const hasDesktopModule = useHasDesktopModule
export const hasDesktopApp = useHasDesktopApp
export const hasDesktopExtension = useHasDesktopExtension
