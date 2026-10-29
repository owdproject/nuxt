import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DesktopWorkareaRect } from '../../types'
import { useDesktopHooks } from '../composables/useDesktopHooks'
import { useDesktopIPC } from '../composables/useDesktopIPC'

export const EMPTY_DESKTOP_WORKAREA: DesktopWorkareaRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

export const useDesktopWorkspaceStore = defineStore('desktop/workspace', () => {
  const list = ref<string[]>([
    'workspace-1',
    'workspace-2',
    'workspace-3',
    'workspace-4',
  ])
  const active = ref<string>('workspace-1')
  const overview = ref<boolean>(false)
  const workarea = ref<DesktopWorkareaRect>({ ...EMPTY_DESKTOP_WORKAREA })

  const workspaceActiveIndex = computed(() =>
    list.value.indexOf(active.value),
  )

  function setWorkspace(workspaceId: string): boolean {
    if (!list.value.includes(workspaceId)) return false
    const previous = active.value
    if (previous === workspaceId) return true

    const { callHook } = useDesktopHooks()
    const switchCtx = {
      from: previous,
      to: workspaceId,
      cancel: false,
    }
    void callHook('workspace:before-switch', switchCtx)
    if (switchCtx.cancel) return false

    active.value = switchCtx.to
    void callHook('workspace:switched', { from: previous, to: switchCtx.to })
    useDesktopIPC().emit(
      'workspace:switched',
      { from: previous, to: switchCtx.to },
      { source: 'workspace-store', severity: 'info' },
    )
    return true
  }

  function setOverview(value: boolean) {
    overview.value = value
  }

  function toggleOverview() {
    overview.value = !overview.value
  }

  function setWorkarea(rect: DesktopWorkareaRect) {
    workarea.value = { ...rect }
  }

  function addWorkspace(id?: string): string {
    const nextId = id || `workspace-${list.value.length + 1}`
    if (!list.value.includes(nextId)) {
      list.value.push(nextId)
    }
    return nextId
  }

  function resolveWorkspaceFallback(removedId: string): string | null {
    const remaining = list.value.filter((id) => id !== removedId)
    if (remaining.length === 0) return null
    return remaining[remaining.length - 1] ?? remaining[0] ?? null
  }

  function removeWorkspace(workspaceId: string): boolean {
    if (list.value.length <= 1) return false
    const idx = list.value.indexOf(workspaceId)
    if (idx < 0) return false

    const fallback = resolveWorkspaceFallback(workspaceId)
    list.value.splice(idx, 1)

    if (active.value === workspaceId && fallback) {
      active.value = fallback
    }
    return true
  }

  return {
    list,
    active,
    overview,
    workarea,
    workspaceActiveIndex,
    setWorkspace,
    setOverview,
    toggleOverview,
    setWorkarea,
    addWorkspace,
    removeWorkspace,
    resolveWorkspaceFallback,
  }
})
