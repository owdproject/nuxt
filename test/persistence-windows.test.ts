import { beforeEach, expect, it, vi } from 'vitest'
import { createApp, computed, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'
vi.mock('../src/runtime/composables/useDesktopCommands', () => ({
  useDesktopCommands: () => ({ register() {} }),
}))
import { ApplicationController } from '../src/runtime/internal/controllers/ApplicationController'
import { apps } from '../src/runtime/composables/application/state'
import { useDesktopWindow } from '../src/runtime/composables/window/useDesktopWindow'
import { applicationWindowsStoreId } from '../src/runtime/stores/storeApplicationWindows'

let storage: Map<string, string>
function boot() {
  const pinia = createPinia()
  pinia.use(
    createPersistedStatePlugin({
      persist: false,
      assertStorage() {},
      storage: {
        getItem: async (key) => storage.get(key) ?? null,
        setItem: async (key, value) => {
          storage.set(key, value)
        },
        removeItem: async (key) => {
          storage.delete(key)
        },
      },
    }),
  )
  createApp({}).use(pinia)
  setActivePinia(pinia)
  return pinia
}
beforeEach(() => {
  apps.clear()
  storage = new Map()
  boot()
})

it('restores, closes and reloads windows without stale global window entries', async () => {
  const id = 'org.test.persistence'
  const config = {
    id,
    title: 'Test',
    windows: { main: { title: 'Test', size: { width: 320, height: 240 } } },
  }
  const app = new ApplicationController(id, config as any)
  await app.initApplication()
  apps.set(id, app)
  const windows = useDesktopWindow()
  const rendered = computed(() => [...app.windows.keys()])
  const first = app.openWindow('main')!
  const second = app.openWindow('main')!
  expect(windows.list.value).toHaveLength(2)
  expect(rendered.value).toHaveLength(2)
  await nextTick()
  const saved = storage.get(applicationWindowsStoreId(id))!
  expect(JSON.parse(saved).windows[first.state.id]).toBeDefined()

  // Read the global computed while the app is running, then close a window:
  // the old nonreactive Map left this computed cached.
  expect(windows.list.value).toHaveLength(2)
  second.actions.destroy()
  expect(windows.list.value.map((win) => win.state.id)).toEqual([
    first.state.id,
  ])
  expect(rendered.value).toEqual([first.state.id])
  await nextTick()
  app.sendSignal('SIGKILL')
  apps.clear()
  storage.set(applicationWindowsStoreId(id), saved)
  boot()
  const restored = new ApplicationController(id, config as any)
  await restored.initApplication()
  apps.set(id, restored)
  expect(restored.windows.size).toBe(2)
  await restored.restoreApplication()
  expect(restored.windows.size).toBe(2)
  for (const win of [...restored.windows.values()])
    expect(win.actions.destroy()).toBe(true)
  expect(windows.list.value).toHaveLength(0)
  await nextTick()
  expect(
    JSON.parse(storage.get(applicationWindowsStoreId(id))!).windows,
  ).toEqual({})
  apps.clear()
  boot()
  const closed = new ApplicationController(id, config as any)
  await closed.initApplication()
  expect(closed.windows.size).toBe(0)
})
