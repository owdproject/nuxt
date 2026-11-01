import { defineNuxtModule } from '@nuxt/kit'

// Existing kits use meta.name values different from the package name.
export default defineNuxtModule({
  meta: { name: 'desktop-kit-fixture', configKey: 'fixtureKit' },
  setup(_options, nuxt) {
    nuxt.options.runtimeConfig.public.fixtureKit = true
  },
})
