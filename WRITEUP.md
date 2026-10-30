# Sales Pipeline: Write-up

## What I built and why

A single virtualised table that opens on **My deals today**, for one sales team sharing 50,000 deals. A strip above it shows each stage's count and value, so the board's overview is kept. Most complaints were about triage, trust and speed of work, not about seeing a pipeline. So I focused on telling people what to work on, never losing a save silently, and letting them do everything from the keyboard.

Two views: **My deals today** shows your open deals that need action, each with a visible reason (*Overdue follow-up*, *Closing this week*, *Idle 14+ days*). **All deals** is everything, with sorting, search and filters, including "Not touched in 90+ days" for quarter-end clean-up.

## Key UX decisions and alternatives

- **Table, not a board.** Four of the five complaints suit a list: triage, bulk moves, keyboard use and stability. A board is mouse-led, selecting thousands of cards across columns is awkward, and a 10,000-card column can't be scanned. I rejected a table and board toggle too: it doubles the behaviour to build and avoids the decision.
- **Visible rules, not a score.** A priority score gives one clean order, but its weights would be invented and reps can't see why a deal ranks highly.
- **Row order is frozen.** Live re-sorting is the "deals keep jumping" complaint. Rows update in place. A small prompt appears only when deals have joined or left the list, and `u` or a click refreshes it when the user is ready, keeping focus on the same deal. An edit that doesn't change the list stays quiet, though a value edit can leave a sorted list slightly out of order until the next refresh.
- **Failures persist.** A toast that fades is how "nobody told me" happens, so a failed row keeps a red marker until it is dealt with. A count in the top bar opens the failed deals.
- **Keyboard-first, but discoverable.** My first version hid moves behind shortcuts, and a new user had no idea how to change a deal. So every row now has a stage dropdown, a checkbox and a Retry button, with a one-line hint, and the shortcuts sit on top for heavy users.
- **Bulk moves show consequences.** Selection captures the exact IDs at that moment, so new matches aren't swept in, and moves above 100 deals ask for confirmation.

## Failed saves and teammates' changes

The screen shows confirmed server data plus a separate list of unsaved moves. Optimistic updates never overwrite local data, so a failed save just removes the move, and the row shows the real stage again.

Each deal has one move in flight and one waiting, and a newer move replaces the waiting one. Saves for a deal therefore can't land out of order, and rapid presses send only what's needed.

Every save carries the version the user was looking at when they acted, even if a big bulk move takes a while to reach that deal. If a teammate got there first, the server returns a conflict and nothing is overwritten. The row names the teammate and offers **Keep theirs** or **Apply mine**, and Apply mine is a deliberate new move on the latest version. Undo is a real reverse move with the same check, and it stops if the deal has changed since. Responses and teammate events can arrive out of order, so the store ignores anything older than the version it holds.

Bulk moves go in batches of 200, up to 3 at once, and a single move goes ahead of queued batches, unless that deal is itself waiting in one. A failed batch affects only its own deals, and the summary reports moved, failed, conflicted and skipped counts, with **Retry failed**.

## When things go wrong

| What happens | What the user sees |
|---|---|
| A save fails | The row returns to its real stage with a red marker and a Retry button. It stays until dealt with, and the top bar counts it |
| Several quick moves to one deal | Each keypress shows at once. One save runs at a time, and only the latest waiting move is sent |
| A teammate changed the deal first | Nothing is overwritten. The row names the teammate and offers Keep theirs or Apply mine |
| A teammate moved it to the stage I wanted | Counted as saved, because the deal is where the user asked |
| A teammate edits a deal during a slow bulk move | That deal becomes a conflict, because each move keeps the version from when the user acted |
| A bulk batch fails | Other batches carry on. The summary counts moved, failed, conflicted and skipped deals, and Retry failed resends only the failures |
| Every save fails | The bulk move still finishes with a summary and never hangs |
| Undo after a teammate's change | Undo stops and says so |
| A deal stops matching my filter | It stays in place, greyed out, until the user refreshes the list |
| A failed deal is outside the current view | The "need attention" count opens every failed and conflicted deal, in either view |

## Performance

Only the rows on screen exist in the DOM, about 20 to 40 at a time, and each selects its own deal, so one change re-renders one row. Measured on the production build in Chromium on my machine, with 50,000 deals. These times cover the JavaScript work and exclude painting:

| Action | Time |
|---|---|
| Move focus to the next row | About 4ms |
| Switch view | About 35ms |
| Sort | About 42ms |
| Select all 50,000 deals | About 110ms |
| Start a 20,060-deal bulk move | About 170ms |

Search waits 150ms after typing, so the input never lags.

Bulk moves were the weak spot. Redux copies whatever it changes, so each batch was copying a 50,000-key object. Storing deals in an array with an ID lookup made that update about 7 times faster in isolation (51ms to 8ms), and total store work per batch fell from 124ms to 48ms in a stress test. In a real 20,060-deal move at default delays, taking 34 seconds while moving through rows, batches still cost about 68ms each. The worst was 148ms, and two tasks passed 100ms. The app stays usable, but it isn't perfectly smooth. What's left is mostly the pending-moves object, which is at its largest during a huge move. I tried turning off Immer's freezing and kept the simpler code, because it only saved about 10ms.

## How I verified this

- **Automated tests:** 76 Vitest tests cover the save logic, store, priority rules and key mapping, including rapid moves, partial failure, overlapping bulk moves and blocked undo.
- **Real scenarios:** in the running app I checked failed save and retry, conflict and both choices, a 20,060-deal move at 30% failure, and Retry failed.
- **Overwrite check:** with teammates at maximum, 13 of 5,998 deals changed during a slow bulk move. All 13 became conflicts, and the first one I opened still showed the teammate's stage.
- **Independent review:** a fresh AI review of the whole codebase found one critical bug, the silent overwrite above, and six important issues. Each has a fix, and six of the seven have tests that failed first.
- **Fresh clone:** a clean clone installs, passes the tests and builds.

**What I did not verify:** I ran most scenarios by script, not by hand, and not with a screen reader or an automated accessibility scan. There are no component or browser tests.

## Known limits

- Any teammate change causes a conflict, even a value edit that doesn't affect the stage. It is safe but sometimes over-cautious. A separate stage version would fix it.
- There are no automatic retries, so about 1 save in 10 needs a manual retry. If a real save succeeded but its reply was lost, the retry would see the deal already on that stage and count it as saved. The fake server doesn't simulate lost replies, so only a unit test covers this.
- A page reload resets everything, because the fake server lives in memory.
- Tests cover the save logic, store, rules and key mapping. There are no component or browser tests, so the UI is checked with a manual checklist in the README.

## What I would do with more time

- Shrink the pending-moves cost, to smooth out very large bulk moves
- Add a separate stage version and automatic retries
- Add bulk undo and bulk cancel
- Add a dedicated stale deals view and a needs-attention view
- Add Shift range selection, a tab-close warning and browser tests for the keyboard flows
