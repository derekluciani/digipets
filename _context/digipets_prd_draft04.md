# Digipets | Product Requirements Document 

## Objective  
* Build a functional **Tamagotchi-inspired Web App** using React and Zustand.The application operates as a **real-time finite state machine**, where pet state is driven by a delta-time loop (accounting for time decay) and direct player intervention.

## Role & Expectations  
- You are an expert **web software engineer** specializing in **game design** and **React UI**.  
- You will act as an **autonomous agent**, responsible for architecting and building the entire application.  
- You will produce **complete, functional code** — not pseudocode or placeholders.  
- You will implement an architecture that is flexible enough to handle **feature extensibility** in the future.  
- You will maintain an organized **file structure**.  
- You will define **highly semantic** naming conventions for variables and objects.  
- You will add **concise inline comments** for clarity.  
- You will **request to run the app server** before doing so.
- Yuo will ensure the app is fully functional in modern browsers.
- You will ensure all interactions and state transitions respond in real time.
- You will enable the app to run with command: `npm run dev`
- You will execute all refinements if requested.   

## Success Criteria  . 
- **Caretaker Score**: Calculated at the end of the pet's life. [Use formula](#caretaker-score-formula) 

## Tech Stack  
- **Frontend:** Vite + React  
- **State Management:** Zustand (with `persist` middleware for `localStorage`). [See specification](#zustand-store-structure)
- **Game Engine:** Custom "Delta-Time" loop. *Concept:* Calculates `deltaGameMinutes` between the last saved timestamp and current time to sequentially apply decay and evolution logic. [See specification](#canonical-time)
- **UI Components:** shadcn/ui  
- **Styling:** Tailwind 4 (CSS Variables)
- **Assets:** Standard Emojis for all visual states

## Canonical Time Model
Time proceeds linearly. 1 Game Day equals 1 Pet Year.

| Unit           | Game Time   | Human Time | Notes                     |
| -------------- | ----------- | ---------- | ------------------------- |
| **Tick**       | 1 minutes   | 1 sec      | Base simulation unit      |
| **Hour**       | 60 minutes  | 60 sec     | Decay interval unit       |
| **Day/Year**   | 24 hrs      | 24 minutes | Age increment unit        |

## Day/Night Cycle
- Day time: 12 game hours
- Night time: 12 game hours

## Pet Life Expectancy
| Pet Type   | Life Expectancy     | Real-Time Duration |
| ---------- | ------------------- | ------------------ |
| Fox        | 10 game years       | 4 hours            |
| Axolotl    | 15 game years       | 6 hours            |

## Pet Life Phases
Phases are determined by `AGE` (Game Years).

| Phase   | Name         | Phase Duration             |
| ------- | ------------ | -------------------------- |
| 1       | Baby         | (`lifeExpectancy`) / 4  |
| 2       | Toddler      | (`lifeExpectancy`) / 4  |
| 3       | Teen         | (`lifeExpectancy`) / 4  |
| 4       | Adult        | (`lifeExpectancy`) / 4  |

- **Special Phase:** Reached if `caretakerScore` >= 95 at the end of Adult phase. Adds +5 Years to lifespan.
- Check Phase Evolution: If `AGE` reaches the next threshold, trigger the _Phase Transition_.
- Check Special Condition: At the end of the "Adult" phase, run the [Caretaker Score Formula](#caretaker-score-formula)
    - If `score ≥ 95`, transition to `Special` phase
    - Else, transition to `DEATH` (old age).

## State Management
The Zustand Store is the Single Source of Truth, persisted to `localStorage`. Reference: [Zustand feature docs](zustand-docs-mini.txt)

### Store Schema
| Category   | Key       | Data Type     | Description                                               |
|------------|-----------|---------------|-----------------------------------------------------------|
| Metadata   | petType   | enum          | `Fox`,`Axolotl`; Determines `lifeExpectancy` value and base stats.
|            | name      | string        | User-defined
|            | birthday  | date/time     | Timestamp recorded at the time of pet creation.
|            | lifeExpectancy | number | Determines the lifespan of each `petType`.
| Vitals     | age       | number        | Increments every 24 human minutes (1 game year).
|            | hunger    | number        | `0–100`
|            | mood      | number        | `0–100`
|            | energy    | number        | `0–100`
|            | weight    | number        | `0–100`
|            | health    | number        | `0–100`; Derived from `healthPenaltyPoints`.
|            | fitness   | number        | Tracks `playing` frequency. Hidden from user.
|            | attention | number        | Tracks user response speed. Hidden from user.
| Status     | status    | enum          | `IDLE`, `EATING`, `PLAYING`, `DANCING`, `SLEEPING`, `VOMITING`, `DEAD`
| Condition  | isSick    | boolean       |
|            | isDirty   | boolean       |
| Expression | isWhining | boolean       |
|            | isAngry   | boolean       |
|            | isSad     | boolean       |
|            | isHappy   | boolean       |
|            | isSleepy  | boolean       |
|            | lastTick  | date/time     | Timestamp used to calculate 'Away Time' upon re-opening the app.
| Counter    | poopCount | number        |
|            | healthPenaltyPoints | number |
| Timers     | deltaGameMinutes | number | All timers are tracked in game minutes.
|            | hungerMaxMinutes | number |
|            | moodMinutes | number |
|            | dirtyMinutes | number |
|            | sicknessMinutes | number |
|            | offlineMinutes | number |
|            | elapsedHumanSeconds | number | Tracked in real time.
| Other      | isRadioPlaying | boolean        | Determines if the pet is `DANCING`.
|            | caretakerScore | number | Derived from [formula](#caretaker-score-formula)

## Game Engine
The "Engine" runs on a **Delta-Time Loop**. Instead of just counting seconds, it calculates how much "Game Time" has passed since the last update.

### Delta-Time
- Only simulate fully elapsed game minutes. Ignore partial time.
  ```TypeScript
  deltaGameMinutes = floor((now - lastTickTimestamp) / 1000)
  ````
### State Transition Constraints
To prevent logic errors (e.g., a pet eating while asleep), the Finite State Machine (FSM) follows these rules:
- **Interrupts**: Any active pet `status` (ie. `PLAYING`) must complete or be timed out before `status` returns to `IDLE`.
- **Action Looking**: While pet behavior state is `SLEEPING` or `PLAYING`, all user action UI is disabled.
- **Death Trigger**: If `healthPenalties` reach a threshold or `age` exceeds `lifeExpectancy`, the status shifts to `DEAD`, disabling all loops except the _Keepsake Export_.
  
### Offline Simulation Rules
When a user resumes after inactivity:
- Compute `offlineMinutes = elapsedHumanSeconds`
- Simulate sequentially, never jump state
  - Simulation step size = 1 game minute per iteration
  
Performance cap:
- If `offlineMinutes > 1440` (24 game hours), simulate in minute-by-minute for first 1440 minutes, then _hour-sized steps (60 minutes)_ thereafter.
- All thresholds, timers, and events must still be processed in order.
  
### Vital Timers & Thresholds
- Continuous Time: Any spec listed as `n game minutes/hours`, means continuous 'unbroken' time.
- If a value recovers even briefly, the timer resets.

## Logic & Mechanics

### Constant Decay (per game minute)
Unless `status === SLEEPING`:
- `hunger` +1
- `energy` -1
- `mood` -1

### Health Neglect
**Neglect Conditions:**
1. `hunger === 100`
2. `mood ≤ 10`
3. `poopCount ≥ 3`
4. `dirtyTime ≥ 60`
5. `isVomiting === true`
**Penalty Logic:**
- For each active neglect condition: +1 `healthPenaltyPoints` per 60 game minutes.
- Health Damage: For every 5 `healthPenaltyPoints` -> -5 `health`.
- Health Recovery: No neglect conditions -> `healthPenaltyPoints` -1 per 120 game minutes.

### Death Conditions
`status = DEAD` if:
1. `age` ≥ `lifeExpectancy` (and not qualified for Special phase).
2. `health` ≤ 0.
3. `hunger === 100` for ≥ 720 game minutes (12 hrs).
4. `mood <= 10` for ≥ 720 game minutes.

## User Actions & Impact to Status
| User Action  | Hunger   | Weight   | Mood     | Energy   | Poop Count |
| ------------ | -------- | -------- | -------- | -------- | ---------- |
| Feed         | -20      | +10      | +5       | +5       | +1         |
| Play         | +15      | -15      | +20      | -20      | n/a        |
| Sleep        | +10      | -5       | +10      | +40      | n/a        |
| Clean        | 0        | 0        | +15      | 0        | 0          |

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
  - If value = 0 for ≥180 game minutes -> state=_angry_
  - If value is between 0-33 -> state=_sad_
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
  - Value decreases by -1 per 120 game minutes without feeding.
  - Start value: `
  
### Hidden from user
- **Fitness**
  - This metric tracks the frequency and amount of a pet's play time.
  - Frequent play time positively affects pet health.
- **Attention**
  - This metric tracks the frequency and response time of the user's actions (attention) given to the pet.
  - More frequent action and shorter response times positively affect pet health.
  - Less frequent action and longer response times negatively affect pet health.

## Pet Statuses
What the pet is doing.
- **Idle**
  - Randomly switches between Standing (70%) and Watching TV (30%).
- **Eating**
  - Pet will eat if their hunger is between 1-100.
- **Pooping**
  - Pet poops after every 3 feedings.
  - `dirtyMinutes` timer begins from 0 if `isDirty` value changes from `false` to `true`.
    - If the pet is cleaned, the timer resets.
- **Vomiting**
  - Occurs if Hunger is 100 for 6 game hours, or if fed 6 times in 6 human seconds.
  - When vomiting occurs:
    - hunger value = 0
    - mood value = 0 -> state=_sick_
- **Playing**
  - The pet has 2 different play sequences:
    1. Jumping
    2. Chasing toy
  - Randomly switches between Jumping (50%) and Chasing toy (50%).
  - A pet play sequence will have a duration of 1 game hour.
  - User Actions are disabled during play. 
- **Sleeping**
  - If during Daytime: Nap = 30 game minutes.
  - If during Nighttime: Deep = 6 game hours.
  - User Actions are disabled during sleep.
- **Dancing**
  - The pet dances to a song played from an _internal Radio_ button.
    - Music playback must: be toggeable and never affect gameplay state.
    - Music must be a single looping track.
  - The pet's "Dancing" state is triggered by boolean: `isRadioPlaying: true`.
- **Dead**

## Pet Conditions
What’s wrong with the pet.
- **Sick**
- **Dirty**
<!--- **Injured**-->

## Pet Expressions
How the pet is feeling. Expressions are derived from other states and must never block actions or state transitions and is computed from vitals each tick.
**Whining**
- Triggered if:
   - Hunger ≥ 90 or Hunger = 100 for ≥ 180 game minutes
   - Mood = 0 for ≥ 180 game minutes
   - Energy ≤ 10 or ≥ 90
   - `dirtyMinutes` ≥ 60
- Displays an alert style UI notification.
**Angry**
- Triggered if:
**Sad**
- Triggered if:
**Happy**
- Triggered if:
**Sleepy**
- Triggered if:

## Additional Features
- **Keepsake Feature:** Upon death, use `html2canvas` to allow the user to export a summary card of their pet's final stats, caretaker score and appearance as a JPG image.
- **Persistence:** The game state must be saved to `localStorage` every 5 seconds (human time) so players can return to their pet later.

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
