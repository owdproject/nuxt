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
    storeFactory = defineStore(applicationMetaStoreId(appId), () => {
      if (customSetup) {
        return customSetup()
      }
      const data = reactive<Record<string, any>>({})
      return { data }
    })
    metaStoreRegistry.set(appId, storeFactory)
  }

  return storeFactory
}
