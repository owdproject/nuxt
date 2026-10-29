import { useDesktopApplicationRegistry } from './application/useDesktopApplicationRegistry'
import { useDesktopApplicationProcess } from './application/useDesktopApplicationProcess'
import { useDesktopApplicationExec } from './application/useDesktopApplicationExec'
import { useDesktopApplicationDefine } from './application/useDesktopApplicationDefine'

export function useDesktopApplication() {
  const registry = useDesktopApplicationRegistry()
  const process = useDesktopApplicationProcess()
  const exec = useDesktopApplicationExec()
  const define = useDesktopApplicationDefine()

  return {
    ...registry,
    ...process,
    ...exec,
    ...define,
  }
}

export const useDesktopApplications = useDesktopApplication
