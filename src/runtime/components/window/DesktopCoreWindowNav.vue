<script setup lang="ts">
import { inject } from 'vue'
import { computed } from '@vue/reactivity'

const windowController = inject<IWindowController>('windowController')

const classes = computed(() => {
  const list = ['desktop-window-nav']

  if (
    typeof windowController?.state.active === 'undefined' ||
    !!windowController?.state.active
  ) {
    list.push('desktop-window-nav--active')
  }

  if (windowController?.state.focused) {
    list.push('desktop-window-nav--focused')
  }

  return list
})
</script>

<template>
  <div :class="classes">
    <div class="desktop-window-nav__draggable" />

    <slot />
  </div>
</template>

<style lang="scss">
/**
 * Title/icon sit above the drag layer in DOM order; use pointer-events so
 * mousedown reaches `.desktop-window-nav__draggable` for vue-resizable. Window
 * controls stay clickable.
 */
.desktop-window-nav {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 0;

  &__draggable {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  > :not(.desktop-window-nav__draggable) {
    position: relative;
    z-index: 2;
    pointer-events: none;
  }

  > .desktop-window-nav__btn-group {
    pointer-events: auto;
  }

  > .desktop-window-nav__interactive {
    pointer-events: auto;
  }
}
</style>
