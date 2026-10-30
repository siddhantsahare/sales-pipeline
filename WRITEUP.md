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

## Performance

Only the rows on screen exist in the DOM, about 24 at a time, and each selects its own deal, so one change re-renders one row. Measured in the dev build on my laptop with 50,000 deals:

| Action | Time |
|---|---|
| Move focus to the next row | About 1ms |
| Switch view | About 90ms |
| Sort or refresh row order | About 120ms |
| Start a 20,000-deal bulk move | About 300ms |
| Store work per bulk batch of 200 | About 110ms |

Search waits 150ms after typing, so the input never lags. The weak spot is bulk moves: each batch copies the 50,000-key deals object, so a large move causes a hitch of about 100ms per batch. The app stays usable, but it isn't perfectly smooth. I kept the simpler code, and splitting deals into buckets is the first thing I would change.

## Known limits

- Any teammate change causes a conflict, even a value edit that doesn't affect the stage. It is safe but sometimes over-cautious. A separate stage version would fix it.
- There are no automatic retries or duplicate detection. If a real save succeeded but its response was lost, a retry would report a conflict with the user's own save.
- A page reload resets everything, because the fake server lives in memory.
- Tests cover the save logic, store, rules and key mapping. There are no component or browser tests, so the UI is checked with a manual checklist in the README.

## What I would do with more time

- Split the deals store into buckets, to remove the bulk hitch
- Add a separate stage version, automatic retries and operation IDs for duplicate detection
- Add bulk undo and bulk cancel
- Add a dedicated stale deals view and a needs-attention view
- Add Shift range selection, a tab-close warning and browser tests for the keyboard flows
