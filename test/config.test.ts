import { describe, expect, it } from 'vitest'
import { mergeDesktopConfig } from '../src/kit/authoring'

describe('Nuxt desktop configuration', () => {
  it('supports inline configuration without desktop.config.ts', () => {
    expect(mergeDesktopConfig({ theme: 'win95', workarea: { margin: { top: 48 } } }, {}, 'test'))
      .toMatchObject({ theme: 'win95', workarea: { margin: { top: 48 } }, coreVersion: 'test' })
  })

  it('keeps file defaults and prioritizes inline values, merging extension lists once', () => {
    expect(mergeDesktopConfig(
      { theme: 'win95', apps: ['terminal'], modules: ['fs'], systemBar: { enabled: false } },
      { theme: 'nova', apps: ['terminal', 'notes'], modules: ['fs', 'persistence'], systemBar: { enabled: true, position: 'bottom' } },
      'test',
    )).toMatchObject({
      theme: 'win95', apps: ['terminal', 'notes'], modules: ['fs', 'persistence'],
      systemBar: { enabled: false, position: 'bottom' },
    })
  })

  it('rejects invalid inline app configuration instead of ignoring it', () => {
    expect(() => mergeDesktopConfig({ apps: 'terminal' } as any, {}, 'test'))
      .toThrow('nuxt.config.ts desktop options')
  })
})
