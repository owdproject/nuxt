<script setup lang="ts">
import { inject, computed, type ComputedRef } from 'vue'

const windowContent = inject<WindowContent>('windowContent')
const windowHibernated = inject<ComputedRef<boolean> | undefined>('windowHibernated', undefined)

const classes = computed(() => {
  const list = ['desktop-window__content']

  if (windowContent?.centered) {
    list.push('desktop-window__content--centered')
  }

  if (windowContent?.padded) {
    list.push('desktop-window__content--padded')
  }

  if (windowHibernated?.value) {
    list.push('desktop-window__content--hibernated')
  }

  return list
})
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.desktop-window__content {
  contain: layout paint style;
  content-visibility: auto;

  &--hibernated {
    content-visibility: hidden;
  }
}
</style>
