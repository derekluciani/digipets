# Digipets | Product Requirements Document 

## Objective  
* Build a functional **Tamagotchi-inspired Web App** using React and Zustand.The application operates as a **real-time finite state machine**, where pet state is driven by a delta-time loop (accounting for time decay) and direct player intervention.

## Tech Stack  
- **Frontend:** Vite + React  
- **State Management:** Zustand (with `persist` middleware for `localStorage`). [See specification](#state-management)
- **Game Engine:** Custom "Delta-Time" loop. *Concept:* The purpose is to calculate `deltaTime`, between the last saved timestamp and current time to sequentially apply decay and evolution logic. [See specification](#game-engine)
- **UI Components:** shadcn/ui  
- **Styling:** Tailwind 4 (CSS Variables)
- **Assets:** Standard Emojis to represent all visual states

## Canonical Time Model
Time proceeds linearly. 1 Game Day = 1 Pet Year.

| Unit           | Game Time   | Real Time  | Notes                     |
| -------------- | ----------- | ---------- | ------------------------- |
| **Tick**       | 1 minutes   | 1 sec      | `baseTime`                |
| **Hour**       | 60 minutes  | 60 sec     | `decayTime`               |
| **Day/Year**   | 24 hours    | 24 minutes | `ageTime`                 |

## Day/Night Cycle
- Day time: 12 game hours, represented visually as a `sun` emoji
- Night time: 12 game hours, represented visually as a `moon` emoji

## Pet Life Expectancy
| Pet Type   | Life Expectancy     | Real Time        |
| ---------- | ------------------- | ---------------- |
| Fox        | 10 game years       | 4 hours          |
| Axolotl    | 15 game years       | 6 hours          |

## Pet Life Phases
| Phase   | Name         | Phase Duration             |
| ------- | ------------ | -------------------------- |
| 1       | Baby         | (`lifeExpectancy`) / 4     |
| 2       | Toddler      | (`lifeExpectancy`) / 4     |
| 3       | Teen         | (`lifeExpectancy`) / 4     |
| 4       | Adult        | (`lifeExpectancy`) / 4     |

### Special Phase
- At the end of the "Adult" phase, run the [Caretaker Score Formula](#caretaker-score-formula)
    - If `caretakerScore` ≥ 95, then `isDead: false` and `isSpecial: true` and `lifeExpectancy` +5.
    - Else, `isDead: true`.

## State Management
The Zustand Store is the Single Source of Truth, persisted to `localStorage`. Reference: [Zustand feature docs](zustand-docs-mini.txt)
- **Persistence:** The game state must be saved to `localStorage` every 5 seconds (real time) so players can return to their pet later.

### Store Schema
**!NOTE**: This list may be missing some key line items. Please add any that are required for the app.
| Category   | Key                   | Data Type     | Description                                               |
|------------|-----------------------|---------------|-----------------------------------------------------------|
| Metadata   | petType               | enum          | `Fox`, `Axolotl`; Determines `lifeExpectancy` value and base stats.
|            | name                  | string        | User-defined
|            | birthday              | date/time     | Timestamp recorded at the time of pet creation.
|            | lastTick              | date/time     | Timestamp used to calculate 'Away Time' upon re-opening the app.
|            | firstTick             | date/time     | Timestamp used to calculate 'Away Time' upon re-opening the app.
|            | lifeExpectancy        | number        | Determines the lifespan of each `petType`.
| Phase      | isBaby                | boolean       | Determines if pet is in phase 1 of life.
|            | isToddler             | boolean       | Determines if pet is in phase 2 of life.
|            | isTeen                | boolean       | Determines if pet is in phase 3 of life.
|            | isAdult               | boolean       | Determines if pet is in phase 4 of life.
|            | isSpecial             | boolean       | Determines if pet is in phase 5 of life.
| Vitals     | age                   | number        | Increments every 1 game year (`ageTime`).
|            | hunger                | number        | `0–100`
|            | mood                  | number        | `0–100`
|            | energy                | number        | `0–100`
|            | weight                | number        | `0–100`
|            | healthPoints          | number        | `0–100`; Derived from `penaltyCount`.
| Status     | isIdle                | boolean       | 
|            | isEating              | boolean       |
|            | isPlaying             | boolean       |
|            | isDancing             | boolean       |
|            | isSleeping            | boolean       |
|            | isVomiting            | boolean       | Determines the state of `isSick`. If `isVomiting: true` then `isSick: true`.
|            | isDead                | boolean       |
| Condition  | isSick                | boolean       |
|            | isDirty               | boolean       |
| Expression | isWhining             | boolean       |
|            | isAngry               | boolean       |
|            | isSad                 | boolean       |
|            | isHappy               | boolean       |
| Counter    | poopCount             | number        |
|            | penaltyCount          | number        |
| Timers     | deltaTime             | number        | Tracked in game minutes. [See calculation](#delta-time)
|            | baseTime              | number        | Tracks fundamental game time unit (tick).
|            | decayTime             | number        | Tracks elapsed time between successive game hours.
|            | ageTime               | number        | Tracks elapsed time between successive age changes, in game years.
|            | hungerTime            | number        | Tracks elapsed time between two successive eating events, in game minutes.
|            | starvingTime          | number        | Tracks elapsed time while hunger = 100, in game minutes.
|            | moodTime              | number        | Tracks elapsed time while mood ≤ 10, in game minutes.
|            | fitnessTime           | number        | Tracks a pet's lifetime total of exercise time, in game minutes.
|            | responseTime          | number        | Tracks a pet's lifetime total time pet spent whining unresolved, in game minutes.
|            | dirtyTime             | number        | Tracks elapsed time between state change from `isDirty: true` -> `isDirty: false`, in game minutes.
|            | sickTime              | number        | Tracks elapsed time between state change from `isSick: true` -> `isSick: false`, in game minutes.
|            | sleepTime             | number        | Tracks elapsed time while `isSleeping: true`.
|            | offlineTime           | number        | Tracks elapsed time between `lastTick` and `firstTick` in `elapsedHumanSeconds`.
|            | elapsedHumanSeconds   | number        | Tracks elapsed time in seconds (real time).
| Other      | isRadioPlaying        | boolean       | Determines the state of `isDancing`. If `isRadioPlaying: true` then `isDancing: true`.
|            | isMusicPlaying        | boolean       | Determines the state of music playback. 
|            | isDayTime             | boolean       | Checks for day time phase when `isSleeping: true`. Determines duration of `sleepTime`.
|            | isNightTime           | boolean       | Checks for day time phase when `isSleeping: true`. Determines duration of `sleepTime`.
|            | caretakerScore        | number        | Derived from [formula](#caretaker-score-formula)

## Game Engine
The "Engine" runs on a **Delta-Time Loop**. Instead of just counting seconds, it calculates how much "Game Time" has passed since the last update.

### Delta-Time
Only simulate fully elapsed game minutes. Ignore partial time.
```TypeScript
deltaTime = floor((now - lastTickTimestamp) / 1000)
````
  
### Offline Simulation Rules
When a user resumes after inactivity:
- Compute `offlineTime` = `elapsedHumanSeconds`
- Simulate sequentially, never jump state
  - Simulation step size = 1 game minute per iteration
  
Performance cap:
- If `offlineTime` > 24 minutes (real time), change simulation time from minute-by-minute to _hour-sized steps_.
- All thresholds, timers, and events must still be processed in order.
  
### Vital Timers & Thresholds
- Continuous Time: Any spec listed as `n game minutes` or `n game hours`, means continuous 'unbroken' time.
- If a value recovers even briefly, the timer resets.

## Logic & Mechanics

### Decay (`decayTime`)
If `isSleeping: false` then:
- `hunger` +1
- `energy` -1
- `mood` -1

### Health Neglect
**Neglect Conditions:**
1. `hunger` = 100
2. `starvingTime` ≥ 180 game minutes 
3. `isAngry` = true
4. `dirtyTime` ≥ 180 game minutes
5. `sickTime` ≥ 180 game minutes
6. `hungerTime` ≥ 180 game minutes
7. `weight` = 0 or 100
8. `isVomiting` = true

**Penalty Logic:**
- +1 `penaltyCount` for each neglect condition, per `decayTime`.
- Health Damage: For every 1 `penaltyCount` -> -1 `healthPoints`.
- Health Recovery: If no neglect conditions -> +1 `healthPoints`.

### Death Conditions
`isDead: true` if:
1. `age` > `lifeExpectancy` and `caretakerScore` < 95 at the end of Adult phase.
2. `age` > `lifeExpectancy` and `isSpecial: true`.
3. `healthPoints` ≤ 0.
4. `hunger` = 100 for ≥ 720 game minutes.
5. `mood` ≤ 10 for ≥ 720 game minutes.

## User Actions & Impact to Status
! = per game hour 
| User Action  | Hunger      | Weight     | Mood       | Energy       | Poop Count |
| ------------ | ----------- | ---------- | ---------- | ------------ | ---------- |
| Feed         | -10         | +10        | +5         | +5           | +1         |
| Play         | +10!        | -2!        | +15!       | -5!          | --         | 
| Sleep        | +10!        | -5         | +15        | +10!         | --         | 
| Clean        | --          | --         | --         | --           | --         | 
| Radio        | +5!         | -1!        | +5!        | -5!          | --         | 

## Pet Vitals 
**Age** 
- Displayed as an `integer` (pet year).
- Age counter can only increment by +1.
- Age progression is constant and cannot be altered by any pet healthPoints metrics.
- Start value: `0` years old

**Weight**
- Displayed as an enum: `skinny`, `regular`, `chubby`, `fat`
- Value decreases by -1 per every 240 game minutes without eating.
- If value is between 0-24 -> state=_skinny_
- If value is between 25-50 -> state=_regular_
- If value is between 51-75 -> state=_chubby_
- If value is between 76-100 -> state=_fat_
- Start values: Fox=`35`, Axolotl=`65`

**Hunger**
- Displayed as an enum: `low`, `moderate`, `high`
- If value is between 0-33 -> state=_low_
- If value is between 34–67 -> state=_moderate_
- If value is between 68-89 -> state=_high_
- If value is ≥ 90 -> state=_high_ and _whining_
- If value is 0, the pet will refuse to eat if fed.
- Start value: `90`

**Mood**
- Displayed as an enum: `sick`, `sad`, `angry`, `calm`, `happy`
- If value = 0 for ≥ 180 game minutes -> state=_angry_ and _whining_
- If value is between 0-33 -> state=_sad_ or _sick_
- If value is between 34-67 -> state=_calm_
- If value is between 68-100 -> state=_happy_
- Start value: `33`

**Energy**
- Displayed as an enum: `low`, `moderate`, `high`
- If value is between 0-10 -> state=_low_ and _whining_
- If value is between 11–33 -> state=_low_
- If value is between 34–67 -> state=_moderate_
- If value is between 68-89 -> state=_high_
- If value is between 90-100 -> state=_high_ and _whining_
- Start value: `10`

**Health**
- Displayed as a "HP" `number` and enum: `critical`, `poor`, `fair`, `great`
- If value is between 0-24 -> state=_critical_
- If value is between 25-50 -> state=_poor_
- If value is between 51-75 -> state=_fair_
- If value is between 76-100 -> state=_great_
- Start value: `55`
  
**Fitness**
- `fitnessTime` is to be used as an input for the `caretakerScore` calculation. Longer times result in a higher `caretakerScore`.
- This metric is hidden from the user.

**Attention**
- `responseTime` is to be used as an input for the `caretakerScore` calculation. Shorter times result in a higher `caretakerScore`.
- This metric is hidden from the user.

## Pet Status
What the pet is doing.

**Idle**
- Randomly switches between states:
  - (40%) _standing_
  - (60%) _watching tv_
- The duration of each state, when active, is `10` seconds (real time) before sampling next possible active state.
- User Actions are active during this status. 

**Eating**
- Pet will eat if hunger is between 1-100.
- The duration of this status, when active, is `6` seconds (real time) before resolving to `isIdle: true`.
- User Actions are disabled during this status.

**Pooping**
- `dirtyTime` timer begins if `isDirty` value changes from `false` to `true`.
  - If the pet is cleaned, `isDirty: false` and `dirtyTime` timer resets.
- The duration of this status, when active, is `6` seconds (real time) before resolving to `isIdle: true`.
- User Actions are disabled during sleep.

**Vomiting**
- Occurs if Hunger = 100 or 0 for ≥ 6 game hours, or if fed 6 times in 6 seconds (real time).
- When vomiting occurs:
  - hunger `0`
  - mood `0` -> state=_sick_
  - energy `33`
- The duration of this status, when active, is `6` seconds (real time) before resolving to `isIdle: true`.
- User Actions are disabled during this status.

**Playing**
- Randomly switches between states:
  - (50%) _play with toys_
  - (50%) _chasing ball_
- The duration of each state, when active, is `10` seconds (real time) before sampling next possible active state.
- A pet will play continuously unless:
  - energy `≤ 33` or the user interrupts the pet with a different action.
- User Actions are active during this status.   

**Sleeping**
- `ifSleeping: true`:
  - and `isDayTime: true`, pet sleeps for 60 game minutes before resolving to `isIdle: true`.
  - and `isNightTime: true`, pet sleeps for 360 game minutes before resolving to `isIdle: true`. 
- User Actions are disabled during this status.

**Dancing**
- `isDancing` can only be true if `isRadioPlaying: true`.
- The state of `isRadioPlaying` is toggled via a UI button, Default value: `false`.
  - if `isRadioPlaying: true` -> `isMusicPlaying: true`.
  - Music source asset: [radio_song_loop.mp3](radio_song_loop.mp3)
  - Music playback will loop continuously unless toggled to stop by user.
  - Music playback must never interrupt gameplay state.
- User Actions are active during this status.  

**Dead**
- If `isDead: true` then transition to **Death Screen**.

## Pet Conditions
What’s wrong with the pet.
**Sick**
- `isSick: true` can only change to `false` if mood ≥ `34`.

## Pet Expressions
How the pet is feeling. Expressions are derived from other states.

**Whining**
- if `isWhining: true` then an alert style UI notification is displayed. Notifications are cleared when the condition that triggered them is resolved.

**Dirty**
**Angry**
**Sad**
**Happy**

## Player Achievements
The user/player can accomplish the following achievements as a tracked checklist:
  1. Receive a Caretaker score of ≥90 at the end of a pet's life.
  2. Receive a Caretaker score of ≥95 at the end of a pet's life.
  3. Receive a Caretaker score of 100 at the end of the pet life.
  4. Raise a pet to reach its 'Special' life phase.
  5. Raise all pet types to reach all life phases.

## UI Flow
1. **Start Screen**
  - Create new pet (goto -> New Pet Screen)
  - Choose existing pet (goto -> Game Screen)
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

## APPENDIX

### Caretaker Score purpose
1. Achievements
2. Special phase eligibility
3. End-of-life summary

### Caretaker Score Formula
[See Formula Code](caretakerscore-formula.ts)

### Features to omit
1. Aid / Medicine
2. Social Features
3. Generations / Inheritance
4. Skills / Learn new tricks
5. Sound effects (button clicks, alerts, etc.)

# ! End of Document
