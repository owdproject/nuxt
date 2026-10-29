import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  failOnWarn: false,
  entries: [
    { input: 'src/kit/', outDir: 'dist/kit', ext: 'js', addRelativeDeclarationExtensions: true },
    { input: 'src/types/', outDir: 'dist/types', ext: 'js', addRelativeDeclarationExtensions: true },
  ],
})
