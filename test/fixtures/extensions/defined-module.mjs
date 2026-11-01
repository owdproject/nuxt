import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'fixture-defined-app',
    kind: 'app',
    framework: 'nuxt',
    adapter: '@owdproject/nuxt',
    configKey: 'fixtureApp',
    requires: ['@owdproject/nuxt-kit-fixture'],
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.fixtureApp = options
  },
})
