# Implementation Decisions Addendum v1.0

> Purpose: lock down ambiguous or contradictory items in the PRD so an implementer (human or agentic LLM) can build a **logically consistent** app without drift.

---

## 1) Canonical time + simulation

- **Canonical unit:** 1 *game minute* is the smallest simulation step.
- **Delta-time rule:** only simulate **fully elapsed game minutes** (discard partial seconds).
- **Authoritative timestamp:** store `lastSimulatedAt` (ms epoch). On resume, compute `elapsedHumanSeconds = floor((now - lastSimulatedAt)/1000)`.

### Persistence rule (fixes 5s save vs offline sim)

Persist state to localStorage:

- every **5 real seconds**, **and**
- on `visibilitychange` (hidden) and `beforeunload`.

Always update `lastSimulatedAt` **after** the last simulated step (so you never “double sim”).

---

## 2) Multi-pet model

UI flow implies multiple pets. Implement as:

- `pets: Record<PetId, PetState>`
- `activePetId: PetId`
- `player: { achievements, settings }` (player-level, not per-pet)

---

## 3) Replace status booleans with one enum

To prevent contradictory overlaps, implement:

- `status: PetStatus`

Where:

- `PetStatus = Idle | Eating | Pooping | Playing | Sleeping | Vomiting | Dancing | Dead`

All “isX” booleans become **derived selectors**:

- `isSleeping := status === "Sleeping"`, etc.

---

## 4) Day/night representation

Replace `isDayTime` + `isNightTime` with a single derived phase:

- `minuteOfDay: 0..1439` (increments with simulation)
- `dayPhase := minuteOfDay < 720 ? "Day" : "Night"`

(12 game hours each, per PRD)

---

## 5) Vitals storage + clamping

Store these as **integers**, clamped to `[0, 100]` after every change:

- `hunger, mood, energy, weight, healthPoints`

Store `age` as integer; increments by **exactly +1** at each `ageTime`.

---

## 6) Timers: explicit definitions (continuous/unbroken)

Timers increment **per simulated game minute** only while their condition is true; otherwise reset to `0`.

- `starvingTime`: condition `hunger === 100`
- `hungerTime`: condition `hunger === 0` *(used for overfeeding/“too full” rules implied by PRD)*
- `moodTime`: condition `mood <= 10`
- `dirtyTime`: condition `isDirty === true`
- `sickTime`: condition `isSick === true`
- `sleepTime`: condition `status === "Sleeping"`
- `fitnessTime`: increments while `status === "Playing"`
- `responseTime`: increments while `isWhining === true`

---

## 7) Conditions vs expressions (store only conditions)

### Stored conditions

- `isDirty: boolean`
- `isSick: boolean`

### Derived expressions (never stored)

- `isWhining` is derived if **any** of:
  - `hunger >= 90` OR
  - `energy <= 10` OR
  - `(mood === 0 AND moodTime >= 180)` OR
  - `mood <= 10`
- `isAngry := (mood === 0 && moodTime >= 180)`
- `isSad := (mood <= 33 && !isSick && !isAngry)`
- `isHappy := (mood >= 68)`
- `isDirtyExpression := isDirty`

---

## 8) Health model (resolve PRD contradiction)

Make `healthPoints` the primary value; keep `penaltyCount` as a *lifetime counter*.

Per `decayTime` (each game hour), compute neglect conditions; then:

- `penaltyCount += (number of neglect conditions currently true)`
- `healthPoints -= (number of neglect conditions currently true)`
- If **zero** neglect conditions true this hour: `healthPoints += 1`
- Always clamp `healthPoints` to `0..100`

---

## 9) Decay & actions (resolve sleep ambiguity + “!” meaning)

### Base decay (`decayTime`: each game hour)

Apply only if `status NOT IN {Sleeping, Dead}`:

- hunger `+1`
- energy `-1`
- mood `-1`

### Action table interpretation

- Values with `!` apply **each full game hour while that status is active**.
- Values without `!` apply **once on status entry**.

#### Feed

- On button press: if `hunger === 0`, **refuse** (no status change).
- Else: set `status = Eating` for **6 real seconds**.
- Apply once immediately:
  - hunger `-10`
  - weight `+10`
  - mood `+5`
  - energy `+5`
  - `poopCount += 1`

#### Poop / Dirty (missing in schema → deterministic rule)

- Add `poopCount: number` (min 0).
- Rule: `isDirty := poopCount > 0`
- After Eating resolves, if `poopCount > 0`, transition to `status = Pooping` for **6 real seconds**, then `status = Idle`.
- Clean action sets `poopCount = 0` (therefore `isDirty = false`), and resets `dirtyTime = 0`.

#### Play

- Set `status = Playing` (until stopped, or auto-stop)
- Per game hour while Playing:
  - hunger `+10`
  - weight `-2`
  - mood `+15`
  - energy `-5`
- Auto-stop condition (per PRD): if `energy <= 33`, transition to Idle.

#### Sleep

- Set `status = Sleeping`
- Duration:
  - Day: **60 game minutes**
  - Night: **360 game minutes**
- On entry (once):
  - weight `-5`
  - mood `+15`
- Per game hour while Sleeping:
  - hunger `+10`
  - energy `+10`
- At end of duration: `status = Idle`

#### Radio / Dancing

- Keep `isRadioPlaying: boolean` and `isMusicPlaying: boolean` as player/device state.
- When toggled on:
  - set `isRadioPlaying = true`
  - set `isMusicPlaying = true`
- Dancing status rule:
  - If current `status === Idle`, set `status = Dancing`
  - If in any other status, **do not interrupt**; switch to Dancing only when next returning to Idle while radio is on.
- While Dancing, apply Radio row per game hour:
  - hunger `+5`
  - weight `-1`
  - mood `+5`
  - energy `-5`

---

## 10) Vomiting + sickness

Vomiting triggers if **any** of:

- `starvingTime >= 360` (6 game hours at hunger 100), OR
- `hungerTime >= 360` (6 game hours at hunger 0), OR
- “fed 6 times in 6 seconds” (track a short rolling window of feed presses)

On enter Vomiting (**6 real seconds**):

- set `hunger = 0`
- set `mood = 0`
- set `energy = 33`
- set `isSick = true`

Clearing sickness (per PRD):

- if `mood >= 34` at any simulation step:
  - set `isSick = false`
  - reset `sickTime = 0`

---

## 11) Death (missing in schema → add it)

Add `isDead: boolean` and enforce:

- When any death condition occurs:
  - `isDead = true`
  - `status = Dead`
- When Dead:
  - stop all simulation
  - disable actions
  - show Death Screen

---

## 12) Offline simulation performance cap (deterministic)

- If offline elapsed ≤ **24 real minutes**: simulate minute-by-minute.
- If > **24 real minutes**: simulate in hour steps, **but** inside each hour step, process threshold crossings in the correct order by checking:
  - age rollover
  - death conditions
  - timer thresholds (e.g., 180m neglect, 720m death)
  - status durations that end mid-hour

Implementation detail: use **eventful stepping** within each hour.

---

## 13) PRD cleanup items (must be edited to remove ambiguity)

Replace truncated / garbled phrases present in the PRD text (e.g., `coun...alculates`, `di...`) with complete sentences so the doc is self-contained for an agentic implementer.

