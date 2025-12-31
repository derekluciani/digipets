# Digipets | Product Requirements Document (v3)

## Objective
- Build a functional **Tamagotchi-inspired Web App** using React and Zustand.
- The application operates as a **real-time finite state machine**, where pet state is driven by a delta-time loop (accounting for time decay) and direct player intervention.

## Tech Stack
- **Frontend:** Vite + React
- **State Management:** Zustand (with `persist` middleware for `localStorage`).
- **Game Engine:** Custom "Delta-Time" loop. [See specification](#game-engine)
- **UI Components:** shadcn/ui
- **Styling:** Tailwind 4 (CSS Variables)
- **Assets:** Standard Emojis to represent all visual states

## Data Structure
The application supports multiple pets and player-level data.
- `pets`: Record<PetId, PetState>
- `activePetId`: PetId
- `player`: { achievements, settings }

## Canonical Time Model
Time proceeds linearly. 1 Game Day = 1 Pet Year.

| Unit           | Game Time   | Real Time  | Notes                     |
| -------------- | ----------- | ---------- | ------------------------- |
| **Minute**     | 1 minute    | 1 sec      | Smallest simulation step  |
| **Hour**       | 60 minutes  | 60 sec     | `decayTime` cycle         |
| **Day/Year**   | 24 hours    | 24 minutes | `ageTime` cycle           |

## Day/Night Cycle
- **Time Tracking**: `minuteOfDay` (0..1439), increments with simulation.
- **Day Phase**: `minuteOfDay < 720` (First 12 game hours). Visual: `sun` emoji.
- **Night Phase**: `minuteOfDay >= 720` (Last 12 game hours). Visual: `moon` emoji.

## Pet Life Expectancy
| Pet Type   | Life Expectancy (L) | Real Time        |
| ---------- | ------------------- | ---------------- |
| Fox        | 10 game years       | 4 hours          |
| Axolotl    | 15 game years       | 6 hours          |

## Pet Life Phases
Phases are determined by `age` thresholds relative to Life Expectancy (`L`). `ceil()` refers to rounding up to the nearest integer.

| Phase   | Name         | Condition (Age Range)           |
| ------- | ------------ | --------------------------------|
| 1       | Baby         | `age < ceil(L/4)`               |
| 2       | Toddler      | `ceil(L/4) <= age < ceil(L/2)`  |
| 3       | Teen         | `ceil(L/2) <= age < ceil(3*L/4)`|
| 4       | Adult        | `age >= ceil(3*L/4)`            |

### Special Phase
- At the end of the "Adult" phase (when `age` reaches `L`), run the [Caretaker Score Formula](#caretaker-score-formula)
    - If `caretakerScore` ≥ 95, then `isSpecial: true` and `lifeExpectancy` increases by 5.
    - Else, `isDead: true` (and `status: Dead`).

## State Management
The Zustand Store is the Single Source of Truth, persisted to `localStorage`.
- **Persistence:** Save to `localStorage` every **5 seconds (real time)**, AND on `visibilitychange` (hidden) and `beforeunload`.
- **Timestamp:** Update `lastSimulatedAt` only *after* a successful simulation step to prevent "double simulation".
- **Manage Multiple Simulations:** Multiple pets are to be managed with their own `lastSimulatedAt`.

### Store Schema (PetState)
**Note**: `status` replaces individual booleans like `isIdle`, `isEating`.

| Category   | Key                   | Data Type     | Description                                               |
|------------|-----------------------|---------------|-----------------------------------------------------------|
| Metadata   | id                    | string        | Unique Pet ID.                                            |
|            | petType               | enum          | `Fox`, `Axolotl`; Determines stats.                       |
|            | lifeExpectancy        | number        | Initial value determined by `petType`
|            | name                  | string        | User-defined.                                             |
|            | birthday              | number        | Timestamp (ms epoch).                                     |
|            | lastSimulatedAt       | number        | Timestamp (ms epoch) of last simulation step.             |
| Status     | status                | enum          | `Idle`, `Eating`, `Pooping`, `Playing`, `Sleeping`, `Vomiting`, `Dancing`, `Dead` |
| Vitals     | age                   | integer       | Increments by exactly +1 every game year (`ageTime`).     |
|            | hunger                | integer       | `0–100`. Clamped.                                         |
|            | mood                  | integer       | `0–100`. Clamped.                                         |
|            | energy                | integer       | `0–100`. Clamped.                                         |
|            | weight                | integer       | `0–100`. Clamped.                                         |
|            | healthPoints          | integer       | `0–100`. Clamped. Primary health tracking.                |
| Flags      | isSpecial             | boolean       | Derived from life phase logic.                            |
| Conditions | isSick                | boolean       | Stored condition.                                         |
|            | isDirty               | boolean       | Derived from `currentPoopCount > 0`.                      |
|            | isDead                | boolean       | Stored condition.                                         |
| Counters   | currentPoopCount      | number        | Increments on Poop. Reset to 0 by Clean.                  |
|            | lifetimePoops         | number        | Increments on Poop. Never resets. Stats only.             |
|            | mealsSincePoop        | number        | Tracks meals eaten to trigger next poop.                  |
|            | penaltyCount          | number        | Lifetime counter of neglect events.                       |
| Timers     | minuteOfDay           | integer       | `0..1439`. Tracks daily cycle.                            |
|            | ageTime               | integer       | Tracks minutes towards next age increment.                |
|            | starvingTime          | integer       | Increments while `hunger ≥ 90`, else resets to 0                        |
|            | hungerTime            | integer       | Increments while `hunger ≤ 10` (Too full), else resets to 0               |
|            | moodTime              | integer       | Increments while `mood <= 10`, else resets to 0                            |
|            | fitnessTime           | integer       | Increments while `status === "Playing"`, stored as total time (aggregate) during pet's lifetime. |
|            | responseTime          | integer       | Increments while `isWhining` is true, stored as total time (aggregate) during pet's lifetime. |
|            | dirtyTime             | integer       | Increments while `isDirty` is true, else resets to 0                       |
|            | sickTime              | integer       | Increments while `isSick` is true, else resets to 0                        |
|            | sleepTime             | integer       | Increments while `status === "Sleeping"`, else resets to 0                 |
|            | offlineTime           | number        | Tracks elapsed time in seconds (real time) during offline catch-up.              |
| Settings   | isRadioPlaying        | boolean       | Per-pet setting.                                          |
|            | isMusicPlaying        | boolean       | Per-pet setting.                                          |
| Derived    | caretakerScore        | number        | Derived.                                                  |

### Derived Selectors (Not Stored)
- `isBaby`, `isToddler`, `isTeen`, `isAdult`: Derived from `age` and `petType` thresholds.
- `isWhining`: True if `hunger >= 90` OR `energy <= 10` OR `(mood == 0 && moodTime >= 180)` OR `mood <= 10`.
- `isAngry`: True if `mood == 0` && `moodTime >= 180`.
- `isSad`: True if `mood <= 33` && `!isSick` && `!isAngry`.
- `isHappy`: True if `mood >= 68`.
- `isDayTime` / `isNightTime`: Derived from `minuteOfDay`.

## Game Engine
The engine runs on a **Delta-Time Loop**.

### Delta-Time
- **Simulation Step**: 1 Game Minute.
- **Calculation**: `elapsedHumanSeconds = floor((now - lastSimulatedAt) / 1000)`.
- Only simulate fully elapsed game minutes.

### Offline Simulation Rules
1. Compute `offlineTime` = `elapsedHumanSeconds`.
2. **Performance Cap**:
   - If `offlineTime` ≤ **1440 seconds** (real time): Simulate minute-by-minute.
   - If `offlineTime` > **1440 seconds**: Simulate in **hour-sized steps**, but process internal events (age rollover, death, timer thresholds) in correct order within the hour.
3. Always update state sequentially; never jump.

## Logic & Mechanics

### Decay
**Trigger**: Every game hour (`decayTime`).
**Condition**: Apply only if `status` is **NOT** `Sleeping` or `Dead`.
- `hunger` +1
- `energy` -1
- `mood` -1

### Health Neglect
**Trigger**: Every game hour (`decayTime`).
**Neglect Conditions (Mutually Exclusive):**
Conditions are checked in order. If a condition is met, add +1 to penalty count (for that category) and stop checking *that specific category* if overlaps exist.

1. **Starvation**:
    - IF `starvingTime` ≥ 180 game minutes -> Penalty.
    - ELSE IF `hunger` = 100 -> Penalty.
2. **Overfeeding**:
    - IF `hungerTime` ≥ 180 game minutes (Too full for too long) -> Penalty.
    - Note: `hunger = 0` itself is not a penalty unless sustained.
3. **Sickness**:
    - IF `status` = `Vomiting` -> Penalty.
    - IF `sickTime` ≥ 180 game minutes -> Penalty.  
4. **Hygiene**:
    - IF `dirtyTime` ≥ 180 game minutes -> Penalty.
5. **Emotional**:
    - IF `isAngry` = true (`mood=0` & `moodTime>=180`) -> Penalty.
6. **Weight**:
    - IF `weight` = 0 or 100 -> Penalty.

**Penalty Logic:**
- Sum the penalties from above.
- `penaltyCount` += (total penalties).
- `healthPoints` -= (total penalties).
- **Recovery**: If total penalties is 0, `healthPoints` += 1.
- Clamp `healthPoints` 0–100.

### Death Conditions
`isDead: true` (and `status: Dead`) if:
1. (`age` > `lifeExpectancy` and `isSpecial: false`) OR (`age` > `lifeExpectancy` and `isSpecial: true`).
3. `healthPoints` ≤ 0.
4. `hunger` = 100 for ≥ 720 game minutes.
5. `mood` ≤ 10 for ≥ 720 game minutes.

## User Actions & Impact
- **!** = Applies **every game hour** while status is active.
- **No !** = Applies **once** immediately on status entry.
- **Visual Duration**: Eating and Vomiting visual states last 6s (real time). Their stat effects apply immediately on entry.

| User Action  | Status Change | Duration | Hunger | Weight | Mood | Energy | Poop Count | Notes |
| ------------ | ------------- | -------- | ------ | ------ | ---- | ------ | ---------- | ----- |
| **Feed**     | `Eating`      | 6s (real)| -10    | +10    | +5   | +5     | --         | Refuse if hunger=0. Incr `mealsSincePoop`. |
| **Play**     | `Playing`     | Manual/Auto| +10 **!** | -2 **!** | +15 **!** | -5 **!** | -- | Auto-stop if energy ≤ 33. |
| **Sleep**    | `Sleeping`    | 60m (Day)<br>360m (Night)| +10 **!** | -5 (Once)| +15 (Once)| +10 **!** | -- | -- |
| **Radio**    | `Dancing`     | Manual   | +5 **!**  | -1 **!** | +5 **!**  | -5 **!**  | -- | Only if `Idle`. |
| **Clean**    | (None)        | Immediate| --     | --     | +10  | --     | Set Curr=0 | Resets `dirtyTime`. |

### Status Details
- **Idle**: Default state. Random animations (Standing, Watching TV).
- **Eating**: 6s visual duration. Stats applied on entry. Increments `mealsSincePoop`.
- **Pooping**: 
  - **Trigger**: When entering Idle *after* Eating, if `mealsSincePoop` ≥ 3.
  - **Effect**: `currentPoopCount` +1, `lifetimePoops` +1, `mealsSincePoop` reset to 0. `isDirty` becomes true.
  - **Visual**: Duration 6s.
- **Vomiting**: 
  - **Triggers**: `hungerTime` ≥ 180 OR fed 6 times in 6s (Spamming).
  - **Effects**: `hunger=0`, `mood=0`, `energy=33`, `isSick=true`. Applied immediately.
  - **Visual**: Duration 6s.
- **Playing**: `fitnessTime` increments.
- **Sleeping**: Halts standard Decay.
- **Dancing**: Driven by `isRadioPlaying`. `hunger`, `weight`, `mood`, `energy` apply per hour.
- **Dead**: End of game.

### Sick Condition
- **Cause**: Vomiting.
- **Cure**: `mood` ≥ 34. (Resets `isSick` to false and `sickTime` to 0).

### Radio Player
- Build as a standalone component.
- Default value:`isRadioPlaying: false`. Toggleable via a button.
  - IF `isRadioPlaying: true` -> Trigger audio playback of source asset: [radio_song_loop.mp3](radio_song_loop.mp3)
  - Audio playback will loop continuously unless toggled to stop (`isRadioPlaying: true`).
- User Actions are active during this status.

## Player Achievements
The user/player can accomplish the following achievements as a stored checklist:
  1. Receive a Caretaker score of ≥ 90 at the end of a pet's life.
  2. Receive a Caretaker score of ≥ 95 at the end of a pet's life.
  3. Receive a Caretaker score of 100 at the end of the pet life.
  4. Raise a pet to reach its 'Special' life phase.
  5. Raise all pet types to reach all life phases.

## UI Flow
1. **Start Screen**
  - Create new pet (goto -> New Pet Screen)
  - Choose existing pet (Active pets are displayed as selectable list items) (When selected, goto -> Game Screen)
  - See Achievements (goto -> [Player Achievements](#player-achievements) Screen)
2. **New Pet Screen**
  - Enter pet name
  - Choose pet type
  - Submit (goto -> Game Screen)
3. **Game Screen**
  - Pet Image (Emojis)
  - Vitals display
  - Conditions/Expression indicators
  - User Actions
  - Return to Start Screen (goto Start Screen)
4. **Death Screen**
  - Stats Summary Card:
    - Pet Image (Emoji)
    - Lifespan summary
    - Final pet vital stats
    - Final Caretaker score
    - Export Summary Card as a downloadable file
      - use `html2canvas` to allow the user to export summary card as a JPG image.
  - Return to Start Screen (goto Start Screen)

## Caretaker Score Formula
[See Formula Code](caretakerscore-formula.ts)

## Features to Omit
1. Aid / Medicine (implied simplified by 'Clean'/'Sleep'/'Mood' mechanics).
2. Social Features.
3. Generations.
4. Skills.
5. Complex Sound Effects (keep Radio player loop).

# End of Document
