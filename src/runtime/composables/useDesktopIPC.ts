import { ref, computed } from 'vue'

export interface DesktopKernelEvent {
  id: string
  timestamp: number
  channel: string
  source: string
  severity: 'info' | 'warn' | 'error'
  payload?: any
}

type EventHandler = (event: DesktopKernelEvent) => void

const MAX_EVENTS = 150
const events = ref<DesktopKernelEvent[]>([])
const listeners = new Map<string, Set<EventHandler>>()
let eventCounter = 0

export function useDesktopIPC() {
  function emit(
    channel: string,
    payload?: any,
    options?: { source?: string; severity?: 'info' | 'warn' | 'error' },
  ): DesktopKernelEvent {
    eventCounter++
    const event: DesktopKernelEvent = {
      id: `evt-${Date.now()}-${eventCounter}`,
      timestamp: Date.now(),
      channel,
      source: options?.source ?? 'kernel',
      severity: options?.severity ?? 'info',
      payload,
    }

    events.value = [event, ...events.value.slice(0, MAX_EVENTS - 1)]

    const channelSet = listeners.get(channel)
    if (channelSet) {
      for (const handler of channelSet) {
        try {
          handler(event)
        } catch (err) {
          console.error(`[@owdproject/nuxt][IPC] Error in listener for "${channel}":`, err)
        }
      }
    }

    if (channel !== '*') {
      const wildcardSet = listeners.get('*')
      if (wildcardSet) {
        for (const handler of wildcardSet) {
          try {
            handler(event)
          } catch (err) {
            console.error(`[@owdproject/nuxt][IPC] Error in wildcard listener:`, err)
          }
        }
      }
    }

    return event
  }

  function on(channel: string, handler: EventHandler): () => void {
    if (!listeners.has(channel)) {
      listeners.set(channel, new Set())
    }
    listeners.get(channel)!.add(handler)

    return () => {
      off(channel, handler)
    }
  }

  function off(channel: string, handler: EventHandler): void {
    const channelSet = listeners.get(channel)
    if (channelSet) {
      channelSet.delete(handler)
      if (channelSet.size === 0) {
        listeners.delete(channel)
      }
    }
  }

  function clearEvents(): void {
    events.value = []
  }

  const activeChannels = computed(() => Array.from(listeners.keys()))

  return {
    events,
    activeChannels,
    emit,
    on,
    off,
    clearEvents,
  }
}
