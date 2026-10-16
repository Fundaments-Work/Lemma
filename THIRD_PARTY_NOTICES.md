# Third-party notices

Lemma itself is licensed under the MIT License (see [LICENSE](LICENSE)). The bundled
`main.js` redistributes the packages below, each under its own permissive license.
None of them are copyleft, so the MIT terms of Lemma apply to the whole bundle.

This file lists direct runtime dependencies. Transitive dependencies are bundled by
esbuild from the same packages and retain their own license terms.

## Direct runtime dependencies

| Package | Version | License | Copyright holder |
|---|---|---|---|
| [chart.js](https://github.com/chartjs/Chart.js) | 4.5.1 | MIT | Chart.js Contributors (2014-2024) |
| [pouchdb-browser](https://github.com/pouchdb/pouchdb) | 9.0.0 | Apache-2.0 | Dale Harvey and PouchDB contributors |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | 4.7.1 | MIT | Open Spaced Repetition (2025) |
| [fsrs-browser](https://github.com/open-spaced-repetition/fsrs-browser) | 6.6.0 | BSD-3-Clause | Alex Nguyen (2023) |
| [events](https://github.com/Gozala/events) | 3.3.0 | MIT | Joyent, Inc. and other Node contributors |

Full license texts ship with each package in `node_modules/<package>/`, and are
available from the project links above.

## Compliance notes

- **Apache-2.0** (`pouchdb-browser`) requires that recipients receive the license
  and that modifications are noted. The unmodified license text is redistributed
  in the bundle as `node_modules/pouchdb-browser/LICENSE`. Upstream PouchDB ships
  no `NOTICE` file, so there is no notice to propagate. No source modifications
  are made to bundled dependencies.
- **BSD-3-Clause** (`fsrs-browser`) requires retaining the copyright notice,
  conditions, and disclaimer in redistributions.
- **MIT** packages require the copyright notice and permission notice to be
  included in copies or substantial portions of the software.

## Keeping this file current

Versions follow `package.json`. After changing a dependency, update the version
column above:

```bash
pnpm list chart.js pouchdb-browser ts-fsrs fsrs-browser events --depth 0
```