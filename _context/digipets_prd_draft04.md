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

| Unit           | Game Time   | Human Time | Notes                     |
| -------------- | ----------- | ---------- | ------------------------- |
| **Tick**       | 1 minutes   | 1 sec      | `baseTime`                |
| **Hour**       | 60 minutes  | 60 sec     | `decayTime`               |
| **Day/Year**   | 24 hrs      | 24 minutes | `ageTime`                 |

## Day/Night Cycle
- Day time: 12 game hours, represented visually as a `sun` emoji
- Night time: 12 game hours, represented visually as a `moon` emoji

## Pet Life Expectancy
| Pet Type   | Life Expectancy     | Real-Time Duration |
| ---------- | ------------------- | ------------------ |
| Fox        | 10 game years       | 4 hours            |
| Axolotl    | 15 game years       | 6 hours            |

## Pet Life Phases
| Phase   | Name         | Phase Duration             |
| ------- | ------------ | -------------------------- |
| 1       | Baby         | (`lifeExpectancy`) / 4     |
| 2       | Toddler      | (`lifeExpectancy`) / 4     |
| 3       | Teen         | (`lifeExpectancy`) / 4     |
| 4       | Adult        | (`lifeExpectancy`) / 4     |

### Special Phase**
- At the end of the "Adult" phase, run the [Caretaker Score Formula](#caretaker-score-formula)
    - If `caretakerScore` ≥ 95, then `isDead: false` and `isSpecial: true` and `lifeExpectancy` +5.
    - Else, `isDead: true`.

## State Management
The Zustand Store is the Single Source of Truth, persisted to `localStorage`. Reference: [Zustand feature docs](zustand-docs-mini.txt)

### Store Schema
| Category   | Key                   | Data Type     | Description                                               |
|------------|-----------------------|---------------|-----------------------------------------------------------|
| Metadata   | petType               | enum          | `Fox`,`Axolotl`; Determines `lifeExpectancy` value and base stats.
|            | name                  | string        | User-defined
|            | birthday              | date/time     | Timestamp recorded at the time of pet creation.
|            | lastTick              | date/time     | Timestamp used to calculate 'Away Time' upon re-opening the app.
|            | firstTick             | date/time     | Timestamp used to calculate 'Away Time' upon re-opening the app.
|            | lifeExpectancy        | number        | Determines the lifespan of each `petType`.
| Phase      | isBaby                | boolean       | Determines if pet is in phase 1 of their life.
|            | isToddler             | boolean       | Determines if pet is in phase 2 of their life.
|            | isTeen                | boolean       | Determines if pet is in phase 3 of their life.
|            | isAdult               | boolean       | Determines if pet is in phase 4 of their life.
|            | isSpecial             | boolean       | Determines if pet is in phase 5 of their life.
| Vitals     | age                   | number        | Increments every 24 human minutes (1 game year).
|            | hunger                | number        | `0–100`
|            | mood                  | number        | `0–100`
|            | energy                | number        | `0–100`
|            | weight                | number        | `0–100`
|            | health                | number        | `0–100`; Derived from `penaltyCount`.
|            | fitness               | number        | Tracks `playing` frequency. Hidden from user.
|            | attention             | number        | Tracks user response speed. Hidden from user.
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
|            | dirtyTime             | number        | Tracks elapsed time between state change from `isDirty: true` -> `isDirty: false`, in game minutes.
|            | sickTime              | number        | Tracks elapsed time between state change from `isSick: true` -> `isSick: false`, in game minutes.
|            | sleepTime             | number        | Tracks elapsed time while `isSleeping: true`.
|            | offlineTime           | number        | Tracks elapsed time between `lastTick` and `firstTick` in `elapsedHumanSeconds`.
|            | elapsedHumanSeconds   | number        | Tracks elapsed time in human seconds.
| Other      | isRadioPlaying        | boolean       | Determines the state of `isDancing`. If `isRadioPlaying: true` then `isDancing: true`.
|            | isMusicPlaying        | boolean       | Determines the state of music playback. 
|            | isDayTime             | boolean       | Checks for day time phase when `isSleeping: true`. Determines duration of `sleepTime`.
|            | isNightTime           | boolean       | Checks for day time phase when `isSleeping: true`. Determines duration of `sleepTime`.
|            | caretakerScore        | number        | Derived from [formula](#caretaker-score-formula)

## Game Engine
The "Engine" runs on a **Delta-Time Loop**. Instead of just counting seconds, it calculates how much "Game Time" has passed since the last update.

### Delta-Time
- Only simulate fully elapsed game minutes. Ignore partial time.
  ```TypeScript
  deltaTime = floor((now - lastTickTimestamp) / 1000)
  ````
### State Transition Constraints
To prevent logic errors (e.g., a pet eating while asleep), the Finite State Machine (FSM) follows these rules:
- **Interrupts**: Any active pet `status` (ie. `PLAYING`) must complete or be timed out before `status` returns to `isIdle: true`.
- **Action Looking**: if `isSleeping: true`, then all user action UI is disabled.
  
### Offline Simulation Rules
When a user resumes after inactivity:
- Compute `offlineTime` = `elapsedHumanSeconds`
- Simulate sequentially, never jump state
  - Simulation step size = 1 game minute per iteration
  
Performance cap:
- If `offlineTime` > 24 minutes (real-time), change simulation time from minute-by-minute to _hour-sized steps_.
- All thresholds, timers, and events must still be processed in order.
  
### Vital Timers & Thresholds
- Continuous Time: Any spec listed as `n game minutes` or `n game hours`, means continuous 'unbroken' time.
- If a value recovers even briefly, the timer resets.

## Logic & Mechanics

### Decay (`decayTime`)
if `isSleeping: false` then:
- `hunger` +0.5
- `energy` -0.5
- `mood` -0.5

### Health Neglect
**Neglect Conditions:**
1. `hunger` = 100
2. `starvingTime` ≥ 180 game minutes 
2. `isAngry` = true
4. `dirtyTime` ≥ 180 game minutes
5. `sickTime` ≥ 180 game minutes
6. `hungerTime` ≥ 180 game minutes
5. `isVomiting` = true

**Penalty Logic:**
- For each active neglect condition: +1 `penaltyCount` per 60 game minutes.
- Health Damage: For every 1 `penaltyCount` -> -1 `health`.
- Health Recovery: No neglect conditions -> `penaltyCount` -1 per 120 game minutes.

### Death Conditions
`isDead: true` if:
1. `age` > `lifeExpectancy` and `caretakerScore` < 95 at the end of Adult phase.
2. `health` ≤ 0.
3. `hunger` = 100 for ≥ 720 game minutes.
4. `mood` ≤ 10 for ≥ 720 game minutes.

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
- Age progression is constant and cannot be altered by any pet health metrics.
- Start value: `0` years old

**Weight**
  - Displayed as an enum: `skinny`, `regular`, `chubby`, `fat`
  - Value decreases by -1 per 120 game minutes without feeding.
  - If value is between 0-24 -> state=_skinny_
  - If value is between 25-50 -> state=_regular_
  - If value is between 51-75 -> state=_chubby_
  - If value is between 76-100 -> state=_fat_ 
  - `skinny` or `fat` weight status negatively affects a pet health.
  - Start values: Fox=`skinny`, Axolotl=`chubby`

**Hunger**
  - Displayed as an enum: `low`, `moderate`, `high`
  - If value is between 0-33 -> state=_low_
  - If value is between 34–67 -> state=_moderate_
  - If value is between 68-89 -> state=_high_
  - If value is ≥90 -> state=_high_ and _whining_
  - If value = 100 for ≥180 game minutes -> state=_high_ and _whining_
  - If value is 0, the pet will refuse to eat if fed.
  - Start value: `99`

**Mood**
  - Displayed as an enum: `sick`, `sad`, `angry`, `neutral`, `happy`
  - If value = 0 for ≥ 180 game minutes -> state=_angry_ and _whining_
  - If value is between 0-33 -> state=_sad_ or _sick_
  - If value is between 34-67 -> state=_neutral_
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
  - Displayed as an enum: `critical`, `poor`, `fair`, `great` 
  - Start value: `50`
  
### Hidden from user
**Fitness**
  - This metric tracks the frequency and amount of a pet's play time.
  - Frequent play time positively affects pet health.

**Attention**
  - This metric tracks the frequency and response time of the user's actions (attention) given to the pet.
  - More frequent action and shorter response times positively affect pet health.
  - Less frequent action and longer response times negatively affect pet health.

## Pet Statuses
What the pet is doing.

**Idle**
- Randomly switches between states:
  - (40%) _standing_
  - (60%) _watching tv_
- The duration of each state, when active, is `10` human seconds before sampling next possible active state.

**Eating**
  - Pet will eat if their hunger is between 1-100.

**Pooping**
  - Pet poops after every 3 feedings.
  - `dirtyTime` timer begins if `isDirty` value changes from `false` to `true`.
    - If the pet is cleaned, `isDirty: false` and `dirtyTime` timer resets.

**Vomiting**
- Occurs if Hunger = 100 for ≥ 6 game hours, or if fed 6 times in 6 human seconds.
- When vomiting occurs:
  - hunger `0`
  - mood `0` -> state=_sick_
  - energy `33`

**Playing**
- Randomly switches between states:
  - (50%) _play with toys_
  - (50%) _chasing ball_
- The duration of each state, when active, is `10` human seconds before sampling next possible active state.
- A pet will play continuously unless:
  - energy `≤ 33` or the user interrupts the pet with a different action. 

**Sleeping**
- `ifSleeping: true`:
  - and `isDayTime: true`, pet sleeps for 60 game minutes.
  - and `isNightTime: true`, pet sleeps for 360 game minutes. 
  - User Actions are disabled during sleep.

**Dancing**
- `isDancing` can only be true if `isRadioPlaying: true`.
- The state of `isRadioPlaying` is toggled via a UI button, Default value: `false`.
  - if `isRadioPlaying: true` -> `isMusicPlaying: true`.
  - Music source asset: [filename](filepath)
  - Music playback will loop continuously unless toggled to stop by user.
  - Music playback must never interrupt gameplay state.

**Dead**

## Pet Conditions
What’s wrong with the pet.
**Sick**
- `isSick: true` can only change to `false` if mood ≥ `34`. 

**Dirty**

## Pet Expressions
How the pet is feeling. Expressions are derived from other states and must never block actions or state transitions and is computed from vitals each tick.

**Whining**
- if `isWhining: true` then an alert style UI notification is displayed.

**Angry**
- Triggered if:

**Sad**
- Triggered if:

**Happy**
- Triggered if:

## Additional Features
**Keepsake Feature:** Upon death, use `html2canvas` to allow the user to export a summary card of their pet's final stats, caretaker score and appearance as a JPG image.

**Persistence:** The game state must be saved to `localStorage` every 5 seconds (human time) so players can return to their pet later.

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
    - Export Summary Card as a downloadable JPG image file
  - Return to Start Screen (goto Start Screen)

## APPENDIX
  
  ### Caretaker Score formula
  $ \frac{(Mood \times 0.4) + (Hunger_{\text{inverted}} \times 0.3) + (Fitness \times 0.2) + (Attention \times 0.1)}{TotalTicks} \times 100 $
  
  Note: $ (Hunger_{\text{inverted}}) = (100-currentHunger) $
  
  ### Features to omit
  1. Aid / Medicine
  2. Social Features
  3. Generations / Inheritance
  4. Skills / Learn new tricks
  5. Sound effects (button clicks, alerts, etc.)

# ! End of Document

<!--## UI
## App Folder Structure 
## App Development Process & Task Checklist
### Phase 1 - title
### Phase 2 - title-->
