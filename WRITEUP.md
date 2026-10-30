# Sales Pipeline: Write-up

## What I built and why

A single virtualised table for one team sharing 50,000 deals. Most complaints were about triage, trust and speed, not about seeing a pipeline. So I focused on telling people what to work on, never losing a save silently, and working fully by mouse or keyboard.

**My deals today** shows your open deals that need action, each with a visible reason. **All deals** adds sorting, search and filters, including "Not touched in 90+ days" for quarter-end clean-up. A strip of stage cards keeps a board's overview.

## Key UX decisions and alternatives

- **Table, not a board.** Triage, bulk moves, keyboard use and stability all suit a list. A board is mouse-led, and a 10,000-card column can't be scanned. A table and board toggle would double the work and avoid the decision.
- **Visible rules, not a score.** A score gives one clean order, but its weights would be invented and reps couldn't see why a deal ranks highly.
- **Frozen row order.** Live re-sorting is the "deals keep jumping" complaint. Rows update in place, and a small prompt appears only when deals join or leave the list. A value edit can leave a sorted list slightly out of order until the next refresh.
- **Failures persist.** A fading toast is how "nobody told me" happens, so a failed row keeps a red marker until it is dealt with.
- **Discoverable, not just fast.** My first version hid moves behind shortcuts, and a new user couldn't work out how to change a deal. Rows now have a stage dropdown, checkbox and Retry button.
- **Careful bulk moves.** Selection captures the exact IDs at that moment, and moves above 100 deals ask for confirmation.

## Failed saves and teammates' changes

The screen shows confirmed server data plus a separate list of unsaved moves, so a failed save just removes the move. Each deal has one move in flight and one waiting, and a newer move replaces the waiting one, so saves can't land out of order. Every save carries the version the user was looking at, and the server rejects it if the deal has changed. Late responses and teammate events older than the held version are ignored.

| What happens | What the user sees |
|---|---|
| A save fails | The row returns to its real stage with a red marker and Retry, and the top bar counts it |
| A teammate changed the deal first | Nothing is overwritten. The row names them and offers Keep theirs or Apply mine |
| A teammate moved it to the stage I wanted | Counted as saved |
| A teammate edits a deal during a slow bulk move | That deal becomes a conflict |
| A bulk batch fails | Others carry on. The summary counts moved, failed, conflicted and skipped, and Retry failed resends only failures |
| Every save fails | The bulk move still finishes with a summary |
| Undo after a teammate's change | Undo stops and says so |
| A deal stops matching my filter | It stays in place, greyed out, until I refresh |

## Performance

Only the rows on screen exist in the DOM, and each selects its own deal, so one change re-renders one row. Measured on the production build in Chromium on my machine, with 50,000 deals. Times cover JavaScript work, not painting:

| Action | Time |
|---|---|
| Move focus to the next row | About 4ms |
| Switch view / sort | About 35ms / 42ms |
| Select all 50,000 deals | About 110ms |
| Start a 20,060-deal bulk move | About 170ms |

Bulk moves were the weak spot, because each batch copied a 50,000-key object in Redux. Storing deals in an array made that update about 7 times faster, and store work per batch fell from 124ms to 48ms in a stress test. In a real 20,060-deal move at default delays, batches still cost about 68ms each, with a worst of 148ms. The app stays usable, but it isn't perfectly smooth.

## How I verified this

- **Tests:** 76 Vitest tests cover the save logic, store, priority rules and key mapping.
- **In the running app:** failed save and retry, conflicts, and a 20,060-deal move at 30% failure. With teammates at maximum, 13 of 5,998 deals changed during a slow bulk move, and all 13 became conflicts.
- **Independent review:** a fresh AI review found one critical bug, a queued bulk move silently overwriting a teammate's change, and six important issues. All are fixed.
- **Fresh clone:** a clean clone installs, passes the tests and builds.

**Not verified:** I ran most scenarios by script, not by hand. There are no component or browser tests, and no screen reader or accessibility scan.

## Known limits

- Any teammate change causes a conflict unless the deal is already on the wanted stage, even a value edit.
- There are no automatic retries, so about 1 save in 10 needs a manual retry.
- A reload resets everything, because the fake server lives in memory.

## What I would do with more time

- Shrink the pending-moves cost, to smooth out very large bulk moves
- Add a separate stage version and automatic retries
- Add bulk undo, bulk cancel and Shift range selection
- Add browser tests for the keyboard flows
