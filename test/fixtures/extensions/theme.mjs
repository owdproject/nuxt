import { defineNuxtModule, installModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'fixture-theme', kind: 'theme', framework: 'nuxt' },
  async setup(_options, nuxt) {
    await installModule('@owdproject/nuxt-kit-fixture', {}, nuxt)
  },
})
