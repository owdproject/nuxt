import {
  DesktopPointerSession,
  type WindowBounds,
  type DesktopWorkareaRect,
  type SnapZoneHint,
  type ResizeDirection,
} from '@owdproject/core'

export interface DesktopDragOptions {
  getBounds: () => WindowBounds
  getWorkarea?: () => DesktopWorkareaRect | undefined
  onStart?: () => void
  onMove?: (bounds: WindowBounds, snapZone: SnapZoneHint | null) => void
  onEnd?: (finalBounds: WindowBounds, snapZone: SnapZoneHint | null) => void
  onCancel?: () => void
}

export function useDesktopDrag(options: DesktopDragOptions) {
  function startDrag(event: PointerEvent) {
    return DesktopPointerSession.startDrag(event, {
      initialBounds: options.getBounds(),
      workarea: options.getWorkarea?.(),
      onStart: options.onStart,
      onMove: options.onMove,
      onEnd: options.onEnd,
      onCancel: options.onCancel,
    })
  }

  return {
    startDrag,
  }
}

export interface DesktopResizeOptions {
  getBounds: () => WindowBounds
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  onStart?: () => void
  onMove?: (bounds: WindowBounds) => void
  onEnd?: (finalBounds: WindowBounds) => void
  onCancel?: () => void
}

export function useDesktopResize(options: DesktopResizeOptions) {
  function startResize(event: PointerEvent, direction: ResizeDirection) {
    return DesktopPointerSession.startResize(event, {
      direction,
      initialBounds: options.getBounds(),
      minWidth: options.minWidth,
      minHeight: options.minHeight,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      onStart: options.onStart,
      onMove: options.onMove,
      onEnd: options.onEnd,
      onCancel: options.onCancel,
    })
  }

  return {
    startResize,
  }
}
