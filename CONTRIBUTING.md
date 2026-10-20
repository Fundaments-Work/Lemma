# Contributing to Lemma

Thank you for contributing to Lemma. We welcome bug reports, feature suggestions, and code contributions.

## Development Workflow

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.19 or higher)
- npm (bundled with Node.js; v10 or higher)

### Setup

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/Lemma.git
   cd Lemma
   ```
3. Install dependencies:
   ```bash
   npm ci
   ```

Use npm for all dependency changes. `package-lock.json` is the only committed
lockfile; the community review scanner selects `npm ci` when it is the only one
present.

### Available Scripts

- `npm run build` — Typecheck and bundle with esbuild in production mode.
- `npm run dev` — Watch mode for rapid development.
- `npm test` — Run the Vitest test suite.
- `npm run lint` — Run ESLint with Obsidian plugin rules.
- `npm run lint:fix` — Automatically fix linting violations.
- `node deploy.mjs <vault-path>` — Build and deploy the plugin to an Obsidian vault for live testing.

## Code Conventions

- **Sentence case for UI labels:** Use "API configuration", not "API Configuration".
- **Obsidian guidelines:** Follow all official guidelines from `eslint-plugin-obsidianmd`.
- **DataManager owns state:** UI components read from `DataManager`, never duplicating or holding independent state.
- **Type safety:** Avoid `any` where possible. Use `instanceof` guards for Obsidian vault and DOM types.
- **Accessibility:** Ensure interactive elements support keyboard navigation (`Enter` and `Space`) and provide descriptive ARIA labels.

## Testing & Quality Assurance

Before submitting a pull request:

1. Run the test suite:
   ```bash
   npm test
   ```
2. Check for linting errors and style issues:
   ```bash
   npm run lint
   ```
3. Verify the production build:
   ```bash
   npm run build
   ```
4. Test the built plugin in a live Obsidian vault using `deploy.mjs`. Unit tests use jsdom and a stub of the Obsidian API, so they cannot prove that keyboard handling or modal layout works in the real app. To test in a disposable profile without touching your own, copy a vault into a temporary folder, point `XDG_CONFIG_HOME` at a temporary config directory containing an `obsidian.json` that lists only that vault, and start Obsidian with `--remote-debugging-port=9333` so you can drive it through the Chrome DevTools Protocol. Never run `obsidian` with the default config while testing: it opens your real vault.

## Submitting Pull Requests

1. Create a descriptive feature branch from `main`.
2. Commit changes with clear, concise messages.
3. Push to your fork and open a pull request against `main`.
4. Provide a clear description of the changes, motivation, and any testing performed.

## Licensing

Lemma is licensed under the **MIT License**. Full text is in [LICENSE](LICENSE).

Releases up to and including **v1.1.3** were distributed under the ISC License (OBSD);
from **v1.1.4** onward the plugin is MIT. Both are permissive, so this does not restrict
any existing user.

- **Your contributions are licensed the same way.** By opening a pull request, you agree your
  contribution is provided under the MIT License, with copyright held by Fundaments Work.
- **No separate CLA required.** There is no individual contributor licensing agreement to sign.
- **Keep dependency notices current.** If your change adds or upgrades a bundled runtime
  dependency, update the version table in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
  All current dependencies are permissively licensed and compatible with MIT; anything
  copyleft needs discussion in an issue before it is introduced.
- **Do not add license headers to source files.** Attribution lives in `LICENSE`,
  `manifest.json`, and the README, so it has a single source of truth.

Attribution in shipped metadata must use the organization name **Fundaments Work**, not
personal handles, so that it matches `manifest.json` and the GitHub organization.
