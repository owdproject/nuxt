<template>
  <div class="desktop-background">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.desktop-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--desktop-background-color);
}
</style>
