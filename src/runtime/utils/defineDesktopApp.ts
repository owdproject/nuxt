import type { ApplicationConfig, IApplicationController } from '../../types'
import { useDesktopApplicationDefine } from '../composables/application/useDesktopApplicationDefine'

export async function defineDesktopApp(
  config: ApplicationConfig,
): Promise<IApplicationController | undefined> {
  const { define } = useDesktopApplicationDefine()
  return define(config.id, config)
}
