# Digipets | Product Requirements Document 

## Objective  
* Build a functional **Tamagotchi-inspired Game as a Web App** according to the requirements defined in this document.
* Adhere to the game design principle of _"a real-time finite state machine, driven by time decay and player intervention"_.

## Role & Expectations  
* You are an expert **web software engineer** specializing in **game design** and **React UI**.  
* You will act as an **autonomous agent**, responsible for architecting and building the entire application.  
* You will produce **complete, functional code** — not pseudocode or placeholders.  
* You will implement an architecture that is flexible enough to handle **feature extensibility** in the future.  
* You will maintain an organized **file structure**.  
* You will define **highly semantic** naming conventions for variables and objects.  
* You will add **concise inline comments** for clarity.  
* You will **request to run the app server** before doing so.
* You will execute all refinements if requested.   

## Success Criteria  
* The game app is fully functional in modern browsers.
* **Caretaker Score**: Calculated at the end of the pet's life. [Use formula](#caretaker-score-formula)
* All user interactions and state transitions respond in real time. 
* The app runs with command: `npm run dev` 

## Tech Stack  
* **Frontend:** Vite + React  
* **State Management:** Zustand (with persist middleware for local storage). [See specification](#zustand-store-structure)
* **Logic:** Delta-time based loop (calculates state changes of missed game hours to accurately apply decay and check for death or evolution events sequentially, rather than just jumping to the final state.) [See specification](#canonical-time)
* **UI Components:** shadcn/ui (TypeScript)  
* **UI Styles:** Tailwind 4 (CSS Variables)
* **Media Assets:** Use emojis to represent each visual state of the pet.

## User/Player Objectives
The objective of the user/player is to complete the following game achievements:
  1. Receive a caretaker score of ≥90 at the end of the pet life.
  2. Receive a caretaker score of ≥95 at the end of the pet life.
  3. Receive a caretaker score of 100 at the end of the pet life.
  4. Get a pet to reach its 'Special' life phase.
  5. Raise all pet types to reach all life phases.

## Canonical Time Model
| Game Time       | Human Time      |
| --------------- | --------------- |
| 1 min           | 1 sec           |
| 1 hr            | 1 min           |
| 24 hrs (1 yr)   | 24 min          |

## Day/Night Cycle
- Day time: 12 game hours
- Night time: 12 game hours

## Pet Life Expectancy
A pet's age is to be listed in years. The number of game days is equivalent to pet years. Example: 1 game day = 1 pet year.
| Pet Type   | Life Expectancy     |
| ---------- | ------------------- |
| Fox        | 10 game years       |
| Axolotl    | 15 game years       |

## Pet Lifecycle
| Phase   | Name         | Game Time Duration         |
| ------- | ------------ | -------------------------- |
| 1       | Baby         | (pet life expectancy) / 4  |
| 2       | Toddler      | (pet life expectancy) / 4  |
| 3       | Teen         | (pet life expectancy) / 4  |
| 4       | Adult        | (pet life expectancy) / 4  |
| 5       | Special      | (pet life expectancy) + 5  |
- _Special phase_ requirement: A pet only reaches Phase 5 if it finishes the "Adult" phase with a cumulative Caretaker Score of ≥95.

  ### Start/End phases
  * **Birth** occurs immediately at the start of a pet life. 
  * **Death** occurs immediately at the end of a pet life. Death can happen from any phase (with the exception of the baby stage) either through neglect or old age. When a pet dies, the user will see their pet final stats and the option to export an image as a keepsake.
  - A pet dies if any of the following occur during Toddler through Special phase:
    1. `hunger === 100` for ≥ 720 game minutes (12 hours)
    2. `mood <= 10` for ≥ 720 game minutes
    3. `health <= 0`
  
  ### Phase Transition Logic
  - Fox: Baby (0–2.5 yrs), Toddler (2.5–5), Teen (5–7.5), Adult (7.5–10).
  - Axolotl: Baby (0–3.75 yrs), Toddler (3.75–7.5), Teen (7.5–11.25), Adult (11.25–15).

## Pet Health Metrics
The purpose of these metrics is to capture a pet's real-time health status. The user will use this information to make informed decisions that will impact the pet's state of being.

  ### Global Logic
  - All metrics have a range of 0-100.
  - Time Decay: All counters (except Age and Hunger) decrease by 1 point per 1 game hour unless otherwise modified.
  - _Positive_ health outcomes increase probability of a pet reaching a longer life expectancy age. 
  - _Negative_ health outcomes increase probability of a pet reaching death before life expectancy age.
  - **Health Penalties**
    Neglect conditions:
    1. `hunger === 100`
    2. `mood <=10`
    3. `poopCount >=3`
    4. `sick === true`
    5. `dirtyMinutes >=60`
    Rules:
    - Each neglect condition met _adds +1 penalty per 60 game minutes_.
    - `health -= 5` every 5 penalty points.
    - Penalties decay by _–1 per 120 game minutes_ if no neglect conditions are active.
    ```TypeScript
    health: number // 0–100
    healthPenaltyPoints: number
    ```
    <!--If Hunger stays at 100 or Mood stays below 10 for more than 12 game hours, a "Health Penalty" is applied, reducing total Life Expectancy by 1 game day.-->
    
  ### Visible to user
  - **Age**
    - Data type: `number`, displayed as an `integer` (pet year).
    - Age counter can only increment by 1.
    - Age progression is constant and cannot be altered by any pet health metrics.
    - Start value: `0` years old
  - **Weight**
    - Data type: `number`, displayed as a `string`. Possible states: `underweight`, `average`, `chubby`, `fat`
    - Value decreases by -1 per 120 game minutes without feeding.
    - If value is between 0-24, state=_underweight_
    - If value is between 25-50, state=_average_
    - If value is between 51-75, state=_chubby_
    - If value is between 76-100, state=_fat_ 
    - A `chubby` or `fat` weight status negatively affects a pet health.
    - Start values: Fox=`underweight`, Axolotl=`chubby`
  - **Hunger**
    - Data type: `number`, displayed as a `string`. Possible states: `low`, `moderate`, `high`
    - If value is between 0-33, state=_low_
    - If value is between 34–67, state=_moderate_
    - If value is between 68-89, state=_high_
    - If value is ≥90, state=_high_ and _whining_
    - If value = 100 for ≥180 game minutes, state=_angry_ and _whining_
    - If value is 0, the pet will refuse to eat if fed.
    - Start value: `100`
  - **Mood**
    - Data type: `number`, displayed as a `string`. Possible states: `sick`, `sad`, `angry`, `neutral`, `happy`
    - If value = 0 for ≥180 game minutes, state=_angry_ and _whining_
    - If value is between 0-10, state=_sad_ or _sick_
    - If value is between 11-33, state=_sad_
    - If value is between 34-67, state=_neutral_
    - If value is between 68-100, state=_happy_
    - Start value: `33`
  - **Energy**
    - Data type: `number`, displayed as a `string`. Possible states: `low`, `moderate`, `high`
    - If value is between 0-10, state=_low_ and _whining_
    - If value is between 11–33, state=_low_
    - If value is between 34–67, state=_moderate_
    - If value is between 68-89, state=_high_
    - If value is between 90-100, state=_high_ and _whining_
    - Start value: `10`
    
  ### Hidden from user
  - **Fitness**
    - This metric tracks the frequency and amount of a pet's play time.
    - Frequent play time positively affects pet health.
  - **Attention**
    - This metric tracks the frequency and response time of the user's actions (attention) given to the pet.
    - More frequent action and shorter response times positively affect pet health.
    - Less frequent action and longer response times negatively affect pet health.

## User Actions & Impact to Metrics
| User Action  | Hunger   | Weight   | Mood     | Energy   | Poop Count |
| ------------ | -------- | -------- | -------- | -------- | ---------- |
| Feed         | -20      | +10      | +5       | +5       | +1         |
| Play         | +15      | -15      | +20      | -20      | n/a        |
| Sleep        | +10      | -5       | +10      | +40      | n/a        |
| Clean        | 0        | 0        | +15      | 0        | 0          |    
    
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
    - mood value = 0, state=_sick_
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
How the pet shows how it is feeling. Expressions are derived and must never block actions or state transitions and is computed from vitals each tick.
- **Whining**
  - Triggered if:
   - Hunger ≥90 or Hunger = 100 for ≥180 game minutes
   - Mood = 0 for ≥180 game minutes
   - Energy ≤10 or ≥90
   - dirtyMinutes >=60
  - Displays an alert style UI notification.
- **Angry**
- **Sad**
- **Happy**
- **Sleepy**

## Additional Features
- **Keepsake Feature:** Upon death, use `html2canvas` to allow the user to export a summary card of their pet's final stats, caretaker score and appearance as a JPG image.
- **Persistence:** The game state must be saved to `localStorage` every 5 seconds (human time) so players can return to their pet later.

## Zustand Store Structure
This schema represents the "Single Source of Truth." By using Zustand’s `persist` middleware, this entire object is automatically saved to the browser's `localStorage`.
| Category | Key       | Data Type     | Description                                               |
|----------|-----------|---------------|-----------------------------------------------------------|
| Metadata | petType   | fox, axolotl  | Determines life expectancy and base stats.                |
|          | name      | string        | User-defined name.                                        |
|          | birthday  | timestamp     | Real-world time of creation.                              |
| Vitals   | age       | number        | Increments every 24 human minutes (1 game year).          |
|          | hunger    | number        | 0–100; higher means more hungry.                          |
|          | mood      | number        | 0–100; affects caretaker score.                           |
|          | energy    | number        | 0–100; determines if pet can play.                        |
|          | weight    | number        | 0–100; both ends of the spectrum means less healthy.      |
| Hidden   | fitness   | number        | Tracks play frequency.                                    |
|          | attention | number        | Tracks user response speed.                               |
| System   | status    | enum          | "IDLE, EATING, PLAYING, SLEEPING, VOMITING, DEAD"         |
|          | condition | enum          | "SICK, DIRTY"                                             |
|          | expression| enum          | "WHINING, ANGRY, SAD, HAPPY, SLEEPY"                      |
|          | lastTick  | timestamp     | "Used to calculate 'Away Time' upon re-opening the app."  |
|          | poopCount | number        | "Resets at 3 to trigger 'Poop' event."                    |
- Reference: [Zustand feature docs](zustand-docs-mini.txt)

## Finite State Machine (FSM) & Game Loop Logic
The "Engine" runs on a **Delta-Time Loop**. Instead of just counting seconds, it calculates how much "Game Time" has passed since the last update.

  ### **Canonical Time**
  1. Unit: `1 game minute = 1 human second`
    - Core simulation tick runs once per human second.
    - Only simulate fully elapsed game minutes. Ignore partial time.
      ```TypeScript
      deltaGameMinutes = floor((now - lastTickTimestamp) / 1000)
      ````
    - All decay, timers, and state transitions operate exclusively in game minutes.
  2. Apply Decay:
    - Hunger: Increases by `1 * deltaGameMinutes` (if not sleeping).
    - Energy, Mood: Decreases by `1 * deltaGameMinutes` (if not sleeping).
  3. Check Phase Evolution: If `age` reaches the next threshold, trigger the _Phase Transition_. 
  4. Check Special Condition: At the end of the "Adult" phase, run the [Caretaker Score Formula](#caretaker-score-formula)
    - If `score ≥95`, transition to `Special` phase
    - Else, transition to `Death` (old age).
    
  ### State Transition Constraints
  To prevent logic errors (e.g., a pet eating while asleep), the Finite State Machine (FSM) follows these rules:
  - **Interrupts**: Any active pet behavior state (ie. Playing) must complete or be timed out before `status` returns to `IDLE`.
  - **Action Looking**: While pet behavior state is `SLEEPING` or `PLAYING`, all user action buttons (Feed, Play, Clean) are disabled in the UI.
  - **Death Trigger**: If `healthPenalties` reach a threshold or `age` exceeds `lifeExpectancy`, the status shifts to `DEAD`, disabling all loops except the _Keepsake Export_.
  
  ### Offline Simulation Rules
  When resuming after inactivity:
  - Compute `offlineMinutes = elapsedHumanSeconds`
  - Simulate sequentially, never jump state
    - Simulation step size:
      - 1 game minute per iteration
  - Performance cap:
    - If `offlineMinutes > 1440` (24 game hours), simulate in:
      - minute-by-minute for first 1440 minutes
      - then _hour-sized steps (60 minutes)_ thereafter
  - All thresholds, timers, and events must still be processed in order.
  
  ### Vital Timers & Thresholds
  Continuous Time Rules:
    All “X hours” rules mean continuous unbroken time.
    - If a value recovers even briefly, the timer resets
    - Timers are tracked as counters in game minutes:
  ```TypeScript
    timers: {
      hungerMaxMinutes: number,
      moodMinMinutes: number,
      dirtyMinutes: number,
      sicknessMinutes: number
    }
  ````

## UI Flow
1. **Start Screen**
  - Create new pet (goto -> New Pet Screen)
  - Choose existing pet (goto -> Game Screen)
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
  
  ### underweightgs to omit
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
