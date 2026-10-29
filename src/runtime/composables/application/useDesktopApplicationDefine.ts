import { markRaw } from 'vue'
import { ApplicationController } from '../../internal/controllers/ApplicationController'
import { normalizeApplicationConfig } from '../../utils/utilApp'
import { debugLog } from '../../utils/utilDebug'
import { useDesktopHooks } from '../useDesktopHooks'
import { apps } from './state'

export function useDesktopApplicationDefine() {
  async function define(id: string, config: ApplicationConfig) {
    if (apps.has(id)) {
      debugLog(`App "${id}" is already defined`)
      return apps.get(id)!
    }

    const { callHook } = useDesktopHooks()
    const defineCtx = {
      id,
      config,
      cancel: false,
    }
    await callHook('app:before-define', defineCtx)
    if (defineCtx.cancel) {
      return undefined
    }

    const normalizedConfig = normalizeApplicationConfig(defineCtx.config)
    const applicationConfig = markRaw(normalizedConfig)

    const applicationController = new ApplicationController(defineCtx.id, applicationConfig)
    await applicationController.initApplication()

    const rawController = markRaw(applicationController)
    apps.set(defineCtx.id, rawController)

    await callHook('app:defined', { app: rawController })

    return rawController
  }

  return {
    define,
    defineApp: define,
  }
}
