export function useToggleWindowMaximize() {
  return function toggle(win: any) {
    if (!win) return false
    if (typeof win.toggleMaximize === 'function') {
      return win.toggleMaximize()
    }
    if (typeof win.actions?.toggleMaximize === 'function') {
      return win.actions.toggleMaximize()
    }
    return false
  }
}
