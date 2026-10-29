import { describe, it, expect } from 'vitest'
import { createDesktop } from '@owdproject/core'
import { useDesktop, useWindowManager, useWindowInstance } from '@owdproject/nuxt'
import { createDesktopStore, createWindowStore } from '@owdproject/svelte'
import { DesktopAdapterService } from '@owdproject/angular'
import { getSharedDesktop } from '@owdproject/astro'

describe('Multi-Framework Adapters (@owdproject/nuxt, svelte, angular, astro)', () => {
  it('@owdproject/nuxt binds createDesktop() to Vue shallowRefs and computed', async () => {
    const { desktop, windows, applications, focusedWindow } = useDesktop({
      workspaces: ['ws-1', 'ws-2'],
    })

    expect(windows.value.length).toBe(0)

    desktop.applications.register({
      id: 'org.owd.calc',
      title: 'Calculator',
      windows: {
        main: { title: 'Calc', size: { width: 320, height: 420 } },
      },
      entries: {
        main: {
          command: async (app: any) => {
            await app.openWindow('main')
          },
        },
      },
    })

    await desktop.applications.launch('org.owd.calc')
    expect(applications.value.length).toBe(1)
    expect(windows.value.length).toBe(1)
    expect(focusedWindow.value?.config.title).toBe('Calc')

    const { state } = useWindowInstance(windows.value[0]!)
    expect(state.value.focused).toBe(true)

    const { windows: wmWindows } = useWindowManager(desktop.windows)
    expect(wmWindows.value.length).toBe(1)
  })

  it('@owdproject/svelte exposes Svelte store contract { subscribe }', () => {
    const store = createDesktopStore()
    let latestCount = -1
    const unsub = store.subscribe((snap) => {
      latestCount = snap.windows.length
    })
    expect(latestCount).toBe(0)

    const win = store.desktop.windows.createWindow({
      id: 'svelte-win',
      model: 'main',
      config: { title: 'Svelte Win', size: { width: 400, height: 300 } },
    })
    expect(latestCount).toBe(1)

    const winStore = createWindowStore(win)
    let winFocused = false
    const unsubWin = winStore.subscribe((st) => {
      winFocused = st.focused
    })
    expect(winFocused).toBe(true)

    unsubWin()
    unsub()
  })

  it('@owdproject/angular exposes DesktopAdapterService with subscribable streams', () => {
    const service = new DesktopAdapterService()
    const stream = service.asStream()
    let count = 0
    const sub = stream.subscribe((snap) => {
      count = snap.windows.length
    })
    expect(count).toBe(0)

    service.desktop.windows.createWindow({
      id: 'ng-win',
      model: 'main',
      config: { title: 'Angular Win', size: { width: 500, height: 350 } },
    })
    expect(count).toBe(1)
    sub.unsubscribe()
  })

  it('@owdproject/astro shares a singleton Desktop instance across Islands', () => {
    const d1 = getSharedDesktop()
    const d2 = getSharedDesktop()
    expect(d1).toBe(d2)
  })
})
