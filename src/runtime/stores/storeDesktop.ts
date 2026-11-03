import { reactive } from 'vue'
import { defineStore } from 'pinia'

export interface DesktopGlobalState {
  defaultApps: Record<string, { applicationId: string; entry: string }>
  positionZ: number
}

export const useDesktopStore = defineStore(
  'desktop',
  () => {
    const state = reactive<DesktopGlobalState>({
      defaultApps: {},
      positionZ: 100,
    })

    function incrementPositionZ(): number {
      state.positionZ += 1
      return state.positionZ
    }

    return {
      state,
      incrementPositionZ,
    }
  },
  {
    // Inert unless an optional persistence module (@owdproject/nuxt-module-pinia-persistence
    // or @owdproject/nuxt-module-atproto-persistence) registers the adapter.
    // @ts-expect-error pinia-plugin-persistedstate-2 store option
    persistedState: {
      persist: true,
      // `defaultApps` is rebuilt from config on boot; persist only the z-index seed.
      includePaths: ['state.positionZ'],
    },
  },
)
