<div align="center">

  <h1>@owdproject/nuxt</h1>

  <p>
    <strong>Official Nuxt & Vue 3 Reactive Adapter for Open Web Desktop.</strong><br /><br />
    Reactive composables, pointer drag/resize hooks, and WindowController<br />
    bindings powered by <code>@owdproject/core</code>.
  </p>

  <br />

  <p>
    <a href="https://npmjs.com/package/@owdproject/nuxt"><img src="https://img.shields.io/npm/v/@owdproject/nuxt/alpha.svg?style=flat&colorA=020420&colorB=00DC82" alt="npm version" /></a>
    <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-020420?logo=nuxt" alt="Nuxt" /></a>
    <a href="https://github.com/owdproject/core/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-00DC82.svg?style=flat&colorA=020420&colorB=00DC82" alt="License" /></a>
  </p>

</div>

---

## Overview

`@owdproject/nuxt` (`4.0.0-alpha.0`) bridges [`@owdproject/core`](https://npmjs.com/package/@owdproject/core) to Vue 3 and Nuxt via `shallowRef` subscriptions, computed selectors, and automatic `onScopeDispose` cleanup.

The package includes the Nuxt module, `desktop.config.ts` support, shell components, and Vue bindings. It does not require `nuxt-desktop`.

Register it in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  ssr: false,
  modules: ['@owdproject/nuxt'],
  desktop: {
    theme: '@dxlliv/owd-theme-nuxt-win95',
  },
})
```

Install the theme separately. Inline `desktop` options override `desktop.config.ts`; app and module arrays are merged.

---

## Quick Start

```bash
pnpm add @owdproject/core@4.0.0-alpha.0 @owdproject/nuxt@4.0.0-alpha.0
```

```vue
<script setup lang="ts">
import { useDesktop, useDesktopDrag, useDesktopResize } from '@owdproject/nuxt'

const { desktop, windows, focusedWindow } = useDesktop({
  workarea: { x: 0, y: 32, width: 1440, height: 868 },
})
</script>
```

---

## Exported Composables & Classes

| Export | Description |
| :--- | :--- |
| **`useDesktop(instanceOrOptions?)`** | Reactive bindings for `windows`, `applications`, `workspace`, `commands`, `events`, and `focusedWindow`. |
| **`useWindowManager(manager?)`** | Reactive wrapper around a `WindowManager` instance. |
| **`useWindowInstance(instance)`** | Subscribes a single `WindowInstance` to a Vue `shallowRef<WindowState>`. |
| **`useDesktopDrag(options)`** | W3C Pointer drag composable with snap-zone detection and auto-cleanup. |
| **`useDesktopResize(options)`** | 8-directional W3C Pointer resize composable with min/max constraint enforcement. |
| **`WindowController`** | Reactive Vue wrapper around `@owdproject/core`'s `windowMachine`. |

---

## License

[MIT](https://opensource.org/licenses/MIT)
