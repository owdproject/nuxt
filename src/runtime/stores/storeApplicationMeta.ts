import { reactive } from 'vue'
import { defineStore } from 'pinia'

const metaStoreRegistry = new Map<string, ReturnType<typeof defineStore>>()

export function applicationMetaStoreId(appId: string): string {
  return `desktop/application/${appId}/meta`
}

export function useApplicationMetaStore(
  appId: string,
  customSetup?: () => Record<string, any>,
) {
  let storeFactory = metaStoreRegistry.get(appId)

  if (!storeFactory) {
    storeFactory = defineStore(
      applicationMetaStoreId(appId),
      () => {
        if (customSetup) {
          return customSetup()
        }
        const data = reactive<Record<string, any>>({})
        return { data }
      },
      {
        // Inert unless an optional persistence module registers the adapter.
        // @ts-expect-error pinia-plugin-persistedstate-2 store option
        persistedState: {
          persist: true,
        },
      },
    )
    metaStoreRegistry.set(appId, storeFactory)
  }

  return storeFactory
}
