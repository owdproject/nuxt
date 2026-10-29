export function useWindowDragHandlers(
  _getWindow?: () => any,
) {
  function onDragStart() {}
  function onDragEnd(_data?: { left: number; top: number }) {}

  return { onDragStart, onDragEnd }
}
