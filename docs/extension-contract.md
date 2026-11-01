# Nuxt extension contract

This contract applies to extensions targeting `@owdproject/nuxt`. It separates source behavior from integration requirements. It does not prescribe a visual language or guarantee parity with another framework adapter.

## Current loading and registration

The Nuxt module installs its infrastructure, merges inline `desktop` options with optional `desktop.config.ts`, then installs the configured theme, modules and apps in that order. Inline options win; extension arrays are merged and deduplicated. The resulting public desktop config is also assigned to app config. See [src/module.ts:41](../src/module.ts#L41), [src/module.ts:80](../src/module.ts#L80), [src/module.ts:114](../src/module.ts#L114), [src/kit/authoring.ts:461](../src/kit/authoring.ts#L461).

`DesktopExtensionMeta` describes kind, framework, optional package name, namespace, entry, adapter and required kits/modules. `installDesktopPackage` resolves the actual Nuxt module using `loadNuxtModuleInstance`, reads `getMeta()` (including modules produced by `defineNuxtModule`), and validates explicitly declared extension metadata before calling the installer. Metadata/import errors propagate instead of silently skipping the check. Older modules declaring only Nuxt `meta.name`/`configKey`, and ordinary third-party Nuxt modules, remain supported without adopting the extension contract. See [src/types/index.ts](../src/types/index.ts), [src/kit/authoring.ts](../src/kit/authoring.ts).

Declaring any of `kind`, `framework`, `packageName`, `entry`, `adapter` or `requires` opts into the existing extension contract: `kind` and `framework` are required, optional strings must be non-empty, and `requires` must be an array of non-empty integration names. This host accepts `framework: 'nuxt'` and, when declared, `adapter: '@owdproject/nuxt'`. Other frameworks/adapters fail before extension setup. No package naming inference or ecosystem-wide metadata migration is required.

Each explicit `requires` entry must identify a module already recorded by Nuxt as installed and not explicitly disabled. Matching uses exact `meta.name`, `meta.packageName`, Nuxt's recorded `entryPath` or `meta.rawPath`; the last two allow a theme-installed kit's package name to differ from its historical metadata name. A dependency present on disk, a future item in `desktop.config.ts` or `nuxt.config.ts`, and an unrelated similarly named module do not satisfy a requirement. The existing theme → modules → apps order is unchanged: kits installed and awaited during theme setup are available to subsequent modules/apps; a theme cannot require a kit it only intends to install inside its own setup. Requirements do not install anything or reorder the host.

This gate checks build-time integration records, not service readiness or rendered UI. Nuxt's installed records do not expose every custom setup no-op/`false` result, compatibility skip or later runtime failure, so those remain the host/extension's responsibility. Only extensions loaded through `installDesktopPackage` receive this gate; nested direct Nuxt `installModule` calls contribute installed integrations but are not recursively checked as desktop extensions. Importing the entry to inspect metadata can execute its top-level code. `entry` is descriptive metadata and does not redirect the configured Nuxt module entry. Version ranges, capability negotiation, UI stack behavior and cross-adapter runtime parity are not enforced. Use explicit module/kit identities in `requires`, not semver expressions, and verify the intended host in a standalone playground.

`defineDesktopModule` requires `meta.configKey` and writes merged options under the public desktop namespace; `defineDesktopTheme` merges shell defaults while preserving user values. Public runtime config must contain no secrets. See [src/kit/authoring.ts:372](../src/kit/authoring.ts#L372), [src/kit/authoring.ts:413](../src/kit/authoring.ts#L413).

Runtime `defineDesktopApp` delegates to the Nuxt application registration composable. That path returns an existing id, otherwise runs a cancellable before-define hook, normalizes config, initializes a Nuxt controller and emits app-defined. It is not a direct call to core's application manager. See [src/runtime/utils/defineDesktopApp.ts:4](../src/runtime/utils/defineDesktopApp.ts#L4), [src/runtime/composables/application/useDesktopApplicationDefine.ts:8](../src/runtime/composables/application/useDesktopApplicationDefine.ts#L8). Nuxt controllers share core machines; shared primitives alone do not prove complete lifecycle parity: [src/runtime/internal/controllers/ApplicationController.ts:39](../src/runtime/internal/controllers/ApplicationController.ts#L39).

## Responsibilities by extension kind

| Kind and package convention | Owns | Host integration |
| --- | --- | --- |
| App: `@owdproject/nuxt-app-*` | App identity, commands, entries, content, window models and application resources | Install under `apps`; register via the Nuxt app API in a client lifecycle after shell infrastructure is ready. Use supported application/window actions. |
| Theme: `@owdproject/nuxt-theme-*` | Shell composition, chrome, styling, navigation and accessible controls | Install under `theme`; consume registered apps/windows through public APIs and install/document its required kits. |
| Module: `@owdproject/nuxt-module-*` | A service or optional host capability, configuration and lifecycle | Install under `modules`; document readiness, consumers, failure handling and cleanup. Keep framework-independent implementation in a separate engine when appropriate. |
| Kit: `@owdproject/nuxt-kit-*` | Reusable UI/build integration and its dependency setup | Install explicitly through the consuming theme/module/host and document setup order and exported helpers. |

Each extension must document supported Nuxt/binding versions; direct imports must have declared dependencies/peers. Declare required services and UI stacks separately from optional enhancements. A theme providing PrimeVue, Tailwind, filesystem or persistence does not make it universal. Prefer supported exports; private internal controllers are implementation details.

Apps must own cleanup of listeners, subscriptions, timers and external resources using their real component/plugin/application lifecycle. Do not equate window close with process termination or copy core hook assumptions into Nuxt without checking the controller path. Themes dispatch window actions rather than duplicating controller state; visual freedom includes shells without a taskbar, dock or familiar OS metaphor.

Services must expose a documented interface and readiness/error behavior. Consumers check optional availability and offer a defined fallback or clear requirement. The host decides filesystem, persistence, authentication and network policy. Metadata's `requires` list checks prior Nuxt integration records; it does not install or authorize these services or establish runtime readiness.

Headless business logic can be shared across adapters. Vue windows and Nuxt modules need their own integration. An iframe app requires an explicit host bridge with protocol/version, allowed origins, capability requirements and lifecycle cleanup; an iframe URL alone is not an OWD registration contract.

## Verification and remaining work

Verify the published shape in a standalone Nuxt playground using local packs/Verdaccio snapshots and the intended theme/services. Use `@owdproject/nuxt` for orchestration; the scoped desktop distribution is allowed, the deprecated unscoped `nuxt-desktop` is prohibited throughout the dependency graph. Do not publish to public npm during verification.

The bounded metadata gate is covered by real Nuxt installer fixtures in `test/extension-requirements.test.ts`; it does not establish version compatibility, runtime readiness or cross-adapter behavioral parity. The app/module scaffolds carry role-specific AGENTS.md and local contracts. The desktop blueprint carries host guidance; the CLI propagation checks live in `packages/cli/tests/scaffold-contracts.test.mjs` of the desktop workspace. Those checks cover generation and configuration registration with package-manager processes simulated, not a complete install/build of every generated project.
