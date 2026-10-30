# Sales Pipeline

One keyboard-driven screen for 20 salespeople sharing about 50,000 deals. There is no backend: a fake API inside the app simulates delays, failed saves and teammates' changes.

## Run it

Needs Node 18 or newer.

```bash
npm start
```

This installs dependencies and opens the app at http://localhost:5173. To run the tests:

```bash
npm test
```

## Shortcuts

| Key | Action |
|---|---|
| `↑` `↓` or `j` `k` | Move between rows |
| `x` | Select row |
| `Ctrl+A` | Select every deal matching the filter |
| `m` | Open stage picker (`1`–`7` to choose, `→` for next stage) |
| `/` | Search |
| `Ctrl+Z` | Undo last move |
| `r` | Retry failed save |
| `u` | Apply pending updates |
| `Esc` | Close, or clear selection |
| `?` | Show shortcuts |
| `Tab` | Reach every other control, including sorting, Keep theirs and Apply mine |

## Simulator

The panel at the bottom sets delay, failure rate and teammate activity. **Fail next save** and **Force conflict on next save** trigger those cases on demand.

## How it is organised

```
UI (components/)  ->  store (store/)  <->  sync engine (sync/)  ->  fake server (server/)
```

- `server/` is the only source of truth. It is reached through async calls and returns copies.
- `sync/syncEngine.js` owns every save: per-deal queues, sending, conflicts and undo. It has no React in it.
- `store/` holds three Redux slices: `deals` (confirmed server state), `pending` (unsaved moves) and `ui`.
- `rules/` holds pure business rules: priority reasons, filtering and sorting.
- `keyboard/` turns keys into actions.

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Main view | Virtualised table with a stage strip | Triage, bulk moves and keyboard use all suit a list. A board is mouse-led and shifts under the user |
| Prioritising | Rule-based view with visible reasons | Reps can see why a deal is listed. A score would use invented weights |
| Optimistic updates | Server state plus a separate pending layer | The server copy is never changed, so rollback just removes the pending move |
| Saves | One move in flight per deal, newest waiting move wins | Saves for a deal can't land out of order |
| Conflicts | Version check on every save | The server rejects a save based on old data, and the user chooses what happens |
| Teammates' changes | Update in place, freeze row order until `u` | Rows never jump under the user |

## One save, from keypress to server and back

1. `m` then `6` reaches `moveToStage` in `App.jsx`, which calls `engine.move(dealId, 'won')`.
2. `move` records the undo entry and queues the move. `movesQueued` adds it to the `pending` slice.
3. `selectDisplayDeal` now returns the deal with the pending stage, so the row shows Won and "Saving…" at once. Only that row re-renders.
4. `pump` sees a free request slot, so `sendBatch` calls `api.moveDeals` with the deal's current version.
5. The fake server waits, then does one of three things:
   - **Rejects the request:** `handleFailure` marks the move failed. The row shows server state with a red marker, and `r` retries.
   - **Returns `conflict`:** the version was old. `handleResults` stores the teammate's deal, and the row offers Keep theirs or Apply mine.
   - **Returns `ok`:** `dealsUpdated` stores the new deal, and `movesSaved` removes the pending entry.
6. `settle` frees the deal. If a newer move was waiting, it is queued, and `pump` sends it.

## Manual checklist

Automated tests cover the save logic, store, rules and key mapping. Components are checked by hand:

- [ ] `j`, `k`, `x`, `m`, `/`, `Ctrl+Z`, `r`, `u`, `?` and `Esc` all work without a mouse
- [ ] Typing in search does not trigger shortcuts
- [ ] Failed row shows a red marker that stays until retried
- [ ] Conflict row offers both choices, and `Tab` reaches them
- [ ] Teammates at maximum change rows in place, and focus and scroll stay put
- [ ] Deals that stop matching stay dimmed until `u`
- [ ] A bulk move above 100 deals asks for confirmation
- [ ] The UI stays usable during a bulk move
- [ ] The summary shows correct counts, and Retry failed works
