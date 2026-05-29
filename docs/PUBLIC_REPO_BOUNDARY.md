# Public Repo Boundary

This repository keeps public-facing product and integration documentation in `docs/`.
Internal documentation stays in `docs/internal/` so the local project index remains intact, while the public repository surface stays focused.

## Keep In Public Repo

- `README.md`
- `CHANGELOG.md`
- `docs/RuleForge-API??.md`
- `docs/RuleForge-CLI????.md`
- `docs/RuleForge-REP????.md`
- `docs/RuleForge-??????.md`
- `docs/PUBLIC_DOCS_INDEX.md`

Reason:
These files are user-facing or integration-facing and help external users install, configure, integrate, or contribute to RuleForge.

## Keep Local But Not Public

All internal documentation should live under:

- `docs/internal/`

Current internal categories:
- `docs/internal/product/`
- `docs/internal/planning/`
- `docs/internal/design/`
- `docs/internal/validation/`
- `docs/internal/release/`
- `docs/internal/promo/`
- `docs/internal/process/`

Reason:
These files are internal planning, release-process, product, validation, or operational materials. They remain in the repository tree for local indexing and discovery, but should not be part of the public-facing repository surface.

## Keep But Reconsider Later

- `RELEASE_NOTES.md`

Reason:
This can remain temporarily, but long term it may be better represented through GitHub Releases rather than a persistent top-level file.

## Runtime Boundary

Public integration entrypoints should be limited to:

- CLI: `packages/cli/dist/index.js`
- MCP: `packages/mcp/dist/index.js`

The following should never be treated as automatic runtime entrypoints for external integration:

- `scripts/create-release.ts`
- `scripts/publish-npm.ts`
- `packages/mcp/test/self-loop.ts`
- `packages/cli/demo-cli.ts`
- `packages/core/demo*`
- `demo/`
- `test-workspace/`
