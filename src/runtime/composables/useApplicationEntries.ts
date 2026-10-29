import { type Ref } from 'vue'
import {
  useDesktopApplicationRegistry,
  type SortBy,
  type Visibility,
} from './application/useDesktopApplicationRegistry'

export function useApplicationEntries() {
  const registry = useDesktopApplicationRegistry()

  const sortedAppEntries = function (
    sortBy: SortBy = 'title',
    visibility: Visibility = 'primary',
  ): Ref<any[]> {
    return registry.getSortedEntries(sortBy, visibility)
  }

  return { sortedAppEntries }
}
