import { computed, type ComputedRef } from 'vue'
import { apps } from './state'

export type SortBy = 'title' | 'category' | ((a: any, b: any) => number)
export type Visibility = 'primary' | 'all' | ((entry: any) => boolean)

/**
 * Shared singleton reactive computeds for application registry entries and categories.
 * Avoids duplicate computed watcher creation when 200+ components access the registry.
 */
const sharedRegistryList = computed(() => {
  const entries: any[] = []
  for (const app of apps.values()) {
    if (!app.config.entries) {
      continue
    }
    for (const entryKey of Object.keys(app.config.entries)) {
      const entry = app.config.entries[entryKey]!
      entries.push({
        application: app,
        title: entry.title ?? app.config.title,
        icon: entry.icon ?? app.config.icon,
        category: entry.category ?? app.config.category,
        visibility: entry.visibility ?? 'primary',
        command: entry.command,
      })
    }
  }
  return entries
})

const sharedCategories = computed(() => {
  const categorizedApps: Record<string, IApplicationController[]> = {}
  for (const app of apps.values()) {
    const category = app.config.category || 'other'
    if (!categorizedApps[category]) {
      categorizedApps[category] = []
    }
    categorizedApps[category].push(app)
  }

  for (const category in categorizedApps) {
    categorizedApps[category].sort((a, b) =>
      a.config.title.localeCompare(b.config.title),
    )
  }
  return categorizedApps
})

export function useDesktopApplicationRegistry() {
  function getSortedEntries(
    sortBy: SortBy = 'title',
    visibility: Visibility = 'primary',
  ): ComputedRef<any[]> {
    return computed(() => {
      const currentEntries = [...sharedRegistryList.value]
      const filtered =
        typeof visibility === 'function'
          ? currentEntries.filter(visibility)
          : visibility === 'primary'
            ? currentEntries.filter((e) => e.visibility !== 'secondary')
            : currentEntries

      const sorted =
        typeof sortBy === 'function'
          ? filtered.sort(sortBy)
          : sortBy === 'title'
            ? filtered.sort((a, b) =>
              (a.title || '').localeCompare(b.title || ''),
            )
            : filtered.sort((a, b) =>
              (a.category || '').localeCompare(b.category || ''),
            )

      return sorted
    })
  }

  return {
    list: sharedRegistryList,
    categories: sharedCategories,
    apps,
    get: (id: string) => apps.get(id),
    isAppDefined: (id: string) => apps.has(id),
    getSortedEntries,
  }
}
