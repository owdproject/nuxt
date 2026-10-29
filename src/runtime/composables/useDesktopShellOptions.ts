import { useAppConfig } from 'nuxt/app'
import { computed } from 'vue'

type DesktopAppShape = {
  systemBar?: {
    enabled?: boolean
    position?: string
    startButton?: boolean
  }
}

export function useDesktopShellOptions() {
  const appConfig = useAppConfig()
  const desktop = () => appConfig.desktop as DesktopAppShape | undefined

  const systemBarEnabled = computed(
    () => desktop()?.systemBar?.enabled !== false,
  )

  const systemBarPosition = computed(() => desktop()?.systemBar?.position)

  const startButtonEnabled = computed(
    () => desktop()?.systemBar?.startButton !== false,
  )

  return {
    systemBarEnabled,
    systemBarPosition,
    startButtonEnabled,
  }
}
