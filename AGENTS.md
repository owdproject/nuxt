# @owdproject/nuxt — agent entry point

This repository owns Nuxt orchestration, authoring helpers, Vue shell components, stores/composables and framework controllers. Its guidance is independent of core's AGENTS.md: dependency imports do not load another repository's agent instructions.

- Read [the extension contract](docs/extension-contract.md) for apps, themes, modules and kits. Extension repositories should carry their own compact AGENTS.md linking to that contract at `https://github.com/owdproject/nuxt/blob/main/docs/extension-contract.md` (or the supported release revision), plus their own requirements.
- Engine work belongs to `@owdproject/core`; consult its [behavioral contract](https://github.com/owdproject/core/blob/main/docs/behavioral-contract.md) when relying on engine primitives. Nuxt retains its own controllers; verify the actual path before claiming runtime parity.
- Use `@owdproject/nuxt` and its exported kit/runtime paths for Nuxt authoring. Nuxt extensions use `@owdproject/nuxt-{app,module,kit,theme}-*`; the binding and distribution are not extensions.
- Never import/depend on unscoped `nuxt-desktop`. The scoped `@owdproject/nuxt-desktop` distribution is allowed. Preserve user changes and framework-independent core boundaries.
- Themes own design and composition; impose no universal visual tokens or mandatory OS layout. Declare UI stack requirements explicitly.
- Use Nuxt/Vue tooling for this layer. For extension verification use a standalone playground with locally packed dependencies and Verdaccio snapshots; do not publish publicly.
