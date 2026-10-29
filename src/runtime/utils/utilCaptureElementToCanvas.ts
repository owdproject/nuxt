export async function captureElementToCanvas(
  element: HTMLElement | null | undefined,
  _options?: Record<string, unknown>,
): Promise<HTMLCanvasElement | null> {
  if (!element || typeof document === 'undefined') {
    return null
  }

  try {
    const rect = element.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || element.clientWidth || 320))
    const height = Math.max(1, Math.round(rect.height || element.clientHeight || 200))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)
    }
    return canvas
  } catch {
    return null
  }
}
