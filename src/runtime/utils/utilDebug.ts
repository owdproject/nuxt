import { useRuntimeConfig } from 'nuxt/app'

export function isDebugMode(): boolean {
  try {
    const config = useRuntimeConfig()
    return Boolean((config.public.desktop as any)?.debug)
  } catch {
    return false
  }
}

export function debugLog(...args: unknown[]): void {
  if (isDebugMode()) {
    console.debug('[@owdproject/nuxt]', ...args)
  }
}

export function debugWarn(...args: unknown[]): void {
  if (isDebugMode()) {
    console.warn('[@owdproject/nuxt]', ...args)
  }
}

export function debugError(...args: unknown[]): void {
  if (isDebugMode()) {
    console.error('[@owdproject/nuxt]', ...args)
  }
}
