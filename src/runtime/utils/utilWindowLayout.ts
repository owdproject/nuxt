import {
  computeSnapRect,
  workareaBottom,
  workareaRight,
  type DesktopWorkareaRect,
  type SnapZoneHint,
  type WindowBounds,
  type WindowLayout,
} from '@owdproject/core'
import type { IWindowController } from '../../types'
import { useDesktopHooks } from '../composables/useDesktopHooks'
import { useDesktopIPC } from '../composables/useDesktopIPC'

export {
  computeSnapRect,
  workareaBottom,
  workareaRight,
  type DesktopWorkareaRect,
  type WindowBounds,
  type WindowLayout,
}

export function applySnapToWindow(
  win: IWindowController,
  zone: SnapZoneHint,
  workarea: DesktopWorkareaRect,
): boolean {
  if (!win.isMaximizable) return false
  if (workarea.width <= 0 || workarea.height <= 0) return false

  const rect = computeSnapRect(zone, workarea)
  win.actions.setLayout(zone)
  win.actions.setPosition({ x: rect.x, y: rect.y })
  win.actions.setSize({ width: rect.width, height: rect.height })

  void useDesktopHooks().callHook('window:layout-change', {
    window: win,
    layout: zone,
  })

  useDesktopIPC().emit(
    'window:layout-change',
    {
      windowId: win.state.id,
      title: win.title,
      layout: zone,
    },
    { source: 'display-server', severity: 'info' },
  )

  return true
}
