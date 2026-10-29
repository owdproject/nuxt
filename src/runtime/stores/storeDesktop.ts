import { reactive } from 'vue'
import { defineStore } from 'pinia'

export interface DesktopGlobalState {
  defaultApps: Record<string, { applicationId: string; entry: string }>
  positionZ: number
}

export const useDesktopStore = defineStore('desktop', () => {
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
})
