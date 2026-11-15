# implementation/

The tool itself. The hackathon has started (Sat 14 Nov 2026), so code may now go here.

| Folder | Purpose |
|--------|---------|
| `web/` | Browser front end |
| `server/` | Optional thin Python service that proxies IRSA and converts FITS to images (stack Option B) |
| `tests/` | Automated tests and tiny fixtures |
| `scripts/` | One-off helpers, such as data-access checks and cache warm-up |
| `data/` | Cache of downloaded products (gitignored) and tiny test fixtures |

The stack is not decided: see AGENTS.md sections 5 and 7. If the team picks Option A (static only), `server/` stays empty and is removed.
