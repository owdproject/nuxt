import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installModule, loadNuxt } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { installDesktopPackage, readExtensionMeta } from '../src/kit/authoring'

const fixtures = fileURLToPath(new URL('./fixtures/extensions/', import.meta.url))
let rootDir: string
let nuxt: Nuxt

beforeEach(async () => {
  rootDir = await mkdtemp(join(fixtures, '.host-'))
  nuxt = await loadNuxt({
    cwd: rootDir,
    ready: false,
    overrides: {
      dev: false,
      telemetry: false,
      alias: { '@owdproject/nuxt-kit-fixture': join(fixtures, 'kit.mjs') },
    },
  })
})
afterEach(async () => {
  await nuxt?.close()
  await rm(rootDir, { recursive: true, force: true })
})

async function moduleWithMeta(meta: unknown, extra = '') {
  const path = join(rootDir, 'module.mjs')
  await writeFile(path, `
    export default function fixtureModule(options, nuxt) {
      nuxt.options.runtimeConfig.public.fixtureInstalled = options || true
    }
    fixtureModule.getMeta = async () => (${JSON.stringify(meta)})
    ${extra}
  `)
  return path
}

const app = { kind: 'app', framework: 'nuxt', adapter: '@owdproject/nuxt' }

describe('desktop installer extension requirements with real Nuxt modules', () => {
  it.each([
    [{ ...app, framework: 'react' }, 'framework "react"'],
    [{ ...app, adapter: '@owdproject/react' }, 'adapter "@owdproject/react"'],
    [{ ...app, kind: 'widget' }, 'meta.kind'],
    [{ ...app, requires: 'kit' }, 'meta.requires'],
    [{ ...app, requires: [null] }, 'meta.requires'],
    [{ ...app, adapter: null }, 'meta.adapter'],
    [null, 'metadata must be an object'],
  ])('rejects incompatible or malformed metadata before setup (%j)', async (meta, message) => {
    await expect(installDesktopPackage(nuxt, await moduleWithMeta(meta)))
      .rejects.toThrow(message)
    expect(nuxt.options.runtimeConfig.public.fixtureInstalled).toBeUndefined()
  })

  it('rejects required integrations present on disk or configured but not yet installed', async () => {
    nuxt.options.modules.push('@owdproject/nuxt-kit-fixture')
    await expect(installDesktopPackage(nuxt, join(fixtures, 'defined-module.mjs')))
      .rejects.toThrow('required kit/module "@owdproject/nuxt-kit-fixture" is not active')
    expect(nuxt.options.runtimeConfig.public.fixtureApp).toBeUndefined()
  })

  it('sees a kit installed by the theme and forwards options through defineNuxtModule getMeta', async () => {
    const path = join(fixtures, 'defined-module.mjs')
    expect(await readExtensionMeta(path, nuxt)).toMatchObject(app)
    await installDesktopPackage(nuxt, join(fixtures, 'theme.mjs'))
    await installDesktopPackage(nuxt, path, { fixtureApp: { greeting: 'hello' } })
    expect(nuxt.options.runtimeConfig.public.fixtureKit).toBe(true)
    expect(nuxt.options.runtimeConfig.public.fixtureApp).toEqual({ greeting: 'hello' })
  })

  it('accepts an explicitly installed host module by Nuxt metadata identity', async () => {
    await installModule(join(fixtures, 'kit.mjs'), {}, nuxt)
    const path = await moduleWithMeta({ ...app, requires: ['desktop-kit-fixture'] })
    await installDesktopPackage(nuxt, path)
    expect(nuxt.options.runtimeConfig.public.fixtureInstalled).toBeTruthy()
  })

  it('rejects a disabled integration even when Nuxt records it', async () => {
    nuxt.options.fixtureKit = false
    await installModule('@owdproject/nuxt-kit-fixture', {}, nuxt)
    await expect(installDesktopPackage(nuxt, join(fixtures, 'defined-module.mjs')))
      .rejects.toThrow('is not active')
    expect(nuxt.options.runtimeConfig.public.fixtureKit).toBeUndefined()
  })

  it('supports legacy name/configKey-only descriptors and ordinary third-party Nuxt modules', async () => {
    const path = await moduleWithMeta({ name: 'legacy-module', configKey: 'legacy' })
    await installDesktopPackage(nuxt, path, { legacy: { enabled: true } })
    expect(nuxt.options.runtimeConfig.public.fixtureInstalled).toEqual({ enabled: true })
    const thirdParty = join(rootDir, 'third-party.mjs')
    await writeFile(thirdParty, `export default function thirdParty(_options, nuxt) {
      nuxt.options.runtimeConfig.public.thirdParty = true
    }`)
    await installDesktopPackage(nuxt, thirdParty)
    expect(nuxt.options.runtimeConfig.public.thirdParty).toBe(true)
  })

  it('supports legacy function.meta descriptors', async () => {
    const path = await moduleWithMeta(undefined)
    await writeFile(path, `
      export default function legacyModule(options, nuxt) {
        nuxt.options.runtimeConfig.public.legacy = options
      }
      legacyModule.meta = { name: 'legacy', configKey: 'legacy' }
    `)
    await installDesktopPackage(nuxt, path, { legacy: { enabled: true } })
    expect(nuxt.options.runtimeConfig.public.legacy).toEqual({ enabled: true })
  })

  it('uses getMeta over a misleading function.meta property', async () => {
    const path = await moduleWithMeta(
      { ...app, framework: 'react' },
      `fixtureModule.meta = ${JSON.stringify(app)}`,
    )
    await expect(installDesktopPackage(nuxt, path)).rejects.toThrow('framework "react"')
    expect(nuxt.options.runtimeConfig.public.fixtureInstalled).toBeUndefined()
  })

  it('checks extension contract fields from Nuxt build-time module.json too', async () => {
    const path = await moduleWithMeta({ name: 'built-app' })
    await writeFile(join(rootDir, 'module.json'), JSON.stringify({ ...app, adapter: '@owdproject/react' }))
    await expect(installDesktopPackage(nuxt, path)).rejects.toThrow('adapter "@owdproject/react"')
    expect(nuxt.options.runtimeConfig.public.fixtureInstalled).toBeUndefined()
  })

  it('propagates getMeta failures instead of installing unchecked', async () => {
    const path = await moduleWithMeta(app, `fixtureModule.getMeta = async () => { throw new Error('bad metadata') }`)
    await expect(installDesktopPackage(nuxt, path)).rejects.toThrow('bad metadata')
    expect(nuxt.options.runtimeConfig.public.fixtureInstalled).toBeUndefined()
  })
})
