import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const typesFile = fileURLToPath(new URL('../dist/types.d.mts', import.meta.url))
writeFileSync(typesFile, `export * from './module.mjs'
export { default } from './module.mjs'
`)
