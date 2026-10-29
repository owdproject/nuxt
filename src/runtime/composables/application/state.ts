import { reactive } from 'vue'

export const apps = reactive(new Map<string, IApplicationController>())
