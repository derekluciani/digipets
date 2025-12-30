# Digipets | Product Requirements Document 

## Objective  
* Build a functional **Tamagotchi-inspired Game as a Web App** according to the requirements defined in this document.
* Adhere to the game design principle of "a real-time finite state machine, driven by time decay and player intervention".

## Role & Expectations  
* You are an expert **web software engineer** specializing in **web animation**, **audio programming** and **React UI**.  
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
* **Logic:** Delta-time based loop (calculates state changes based on the difference between `Date.now()` and `lastSavedTimestamp` to handle tab throttling or closing).
* **UI Components:** shadcn/ui (TypeScript, ??? mode)  
* **UI Styles:** Tailwind 4 (CSS Variables, '???' palette)

## User/Player Objectives
* The objective of the user/player is to complete the following game achievements:
  - 1. Receive a caretaker score of ≥90 at the end of the pet life.
  - 2. Receive a caretaker score of ≥95 at the end of the pet life.
  - 3. Receive a caretaker score of 100 at the end of the pet life.
  - 4. Get a pet to reach its 'Special' life phase.
  - 5. Raise all pet types to reach all life phases.

## Game Clock
| Game Time       | Human Time      |
| --------------- | --------------- | 
| 1 min           | 1 sec           |
| 1 hr            | 1 min           |
| 12 hrs          | 12 min          |
| 24 hrs (1 yr)   | 24 min          |

## Day/Night Cycle
- Day time: 12 game hours
- Night time: 12 game hours

## Pet Life Expectancy
A pet age is to be listed in years. The number of game days is equivalent to pet years. Example: 1 game day = 1 pet year.
| Pet Type   | Life Expectancy     |
| ---------- | ------------------- |
| Fox        | 10 game years       |
| Axolotl    | 15 game years       |

## Pet Lifecycle
| Phase   | Name         | Game Time Duration*        |
| ------- | ------------ | -------------------------- |
| 1       | Baby         | (pet life expectancy) / 4  |
| 2       | Toddler      | (pet life expectancy) / 4  |
| 3       | Teen         | (pet life expectancy) / 4  |
| 4       | Adult        | (pet life expectancy) / 4  |
| 5       | Special      | (pet life expectancy) + 5  |

  ### Special phases
  * **Birth** occurs immediately at the start of a pet life.
  * **Death** occurs immediately at the end of a pet life. Death can happen from any phase (with the exception of the baby stage) either through neglect or old age. When a pet dies, the user will see their pet final stats and the option to export an image as a keepsake.
  ### Table footnotes
  - *Game Time Duration example: A Fox's Baby Phase will have a duration of 2.5 game days.
  - Special phase requirement: A pet only reaches Phase 5 if it finishes the "Adult" phase with a cumulative Caretaker Score of ≥95.

## Pet Health Metrics
The purpose of these metrics is to capture the pet real-time health status. The user will use this information to make informed decisions that will impact the pet state of being.

  ### Global Logic
  - All metrics have a range of 0-100.
  - Time Decay: All counters (except Age and Hunger) decrease by 1 point per 1 game hour unless otherwise modified.
  - _Positive_ health outcomes increase probability of a pet reaching a longer life expectancy age.
  - _Negative_ health outcomes increase probability of a pet reaching death before life expectancy age.
    - If Hunger stays at 100 or Mood stays below 10 for more than 12 game hours, a "Health Penalty" is applied, reducing total Life Expectancy by 1 game day.

  ### Visible to user
  - **Age**
    - Data type: `number`, displayed as an `integer` (pet year).
    - Age counter can only increment by 1.
    - Age progression is constant and cannot be altered by any pet health metrics.
    - Start value: `0` years old
  - **Weight**
    - Data type: `number`, displayed as an `string` enum. Possible states: `gaunt`, `average`, `chubby`, `fat`
    - Counter increases when pet is fed.
    - Counter decreases when pet is playing.
    - If counter value is between 0-24, state=_gaunt_
    - If counter value is between 25-50, state=_average_
    - If counter value is between 26-75, state=_chubby_
    - If counter value is between 76-100, state=_fat_ 
    - A `chubby` or `fat` weight status negatively affects a pet health.
    - Various value combinations of Age, Hunger, Energy, Fitness and Attention metrics will alter a pet weight state differently.
    - Start values: Fox=`gaunt`, Axolotl=`chubby`
  - **Hunger**
    - Data type: `number`, displayed as an `string` enum. Possible states: `low`, `moderate`, `high`
    - Counter decreases when pet is fed.
    - Counter increases when pet is playing.
    - If counter value is between 0-10, state=_high_ and _whining_
    - If counter value is between 11–33, state=_low_
    - If counter value is between 34–67, state=_moderate_
    - If counter value is between 68-89, state=_high_
    - If counter value is between 90-100, state=_high_ and _whining_
  
    - If counter value remains at 100 for 3 game hours, state=_angry_ and _whining_
    - If counter value is between 90-100, state=_sad_ and _whining_
    - If counter value is between 76-89, state=_sad_
    - If counter value is 0, the pet will refuse to eat if fed.
    - Various value combinations of Age, Weight, Mood, Energy, Fitness and Attention metrics will alter a pet hunger state differently.
    - Start value: `100`
  - **Mood**
    - Data type: `number`, displayed as an `string` enum. Possible states: `sick`, `sad`, `angry`, `neutral`, `happy`
    - If counter value is between 0-10, state=_sick_ or _sad_ and _whining_
    - If counter value is between 11-33, state=_sad_
    - If counter value is between 34-67, state=_neutral_
    - If counter value is between 68-100, state=_happy_
    - Various value combinations of Age, Weight, Hunger, Energy, Fitness and Attention metrics will alter a pet mood state differently.
    - Start value: `33`
  - **Energy**
    - Data type: `number`, displayed as an `string` enum. Possible states: `low`, `moderate`, `high`
    - If counter value is between 0-10, state=_low_ and _whining_
    - If counter value is between 11–33, state=_low_
    - If counter value is between 34–67, state=_moderate_
    - If counter value is between 68-89, state=_high_
    - If counter value is between 90-100, state=_high_ and _whining_
    - Various value combinations of Age, Weight, Hunger, Mood, Fitness and Attention metrics will alter a pet energy state differently.
    - Start value: `10`
    
  ### Hidden from user
  - **Fitness**
    - This metric tracks the frequency and amount of a pet's play time.
    - Frequent play time positively affects pet health.
  - **Attention**
    - This metric tracks the frequency and response time of the user's actions (attention) given to the pet.
    - More frequent action and shorter response times positively affects pet health.
    - Less frequent action and longer response times negatively affects pet health.
    
  ### Metrics Impact
  | Action  | Hunger   | Weight   | Mood     | Energy   | Poop Count |
  | ------- | -------- | -------- | -------- | -------- | ---------- |
  | Feed    | -20      | +10      | +5       | +5       | +1         |
  | Play    | +15      | -15      | +20      | -20      | -          |
  | Sleep   | +10      | -5       | +10      | +40      | -          |
  | Clean   | 0        | 0        | +15      | 0        | 0          |
    
## Pet Behaviors
- **Eating**
  - Pet poops after every 3 feedings.
- **Pooping**
  - The pet will poop after being fed 3 times. When a pet poops, the "fed" counter resets to 0.
- **Vomiting**
  - Occurs if Hunger is 100 for 6 game hours, or if fed 6 times in 6 human seconds.
- **Idle**
  - Randomly switches between Standing (70%) and Watching TV (30%).
- **Playing**
  - The pet has 2 different play sequences:
    1. Jumping
    2. Chasing toy
  - Selecting the "play" function should randomize the chosen outcome.
    - Assigned probabilities: _Jumping_=0.5tg, _Chasing toy_=0.5
  - A pet play sequence will have a duration of 1 game hour.
  - User Actions are disabled during play. 
- **Sleeping**
  - If during Daytime: Nap = 30 game minutes (30 seconds human time).
  - If during Nighttime: Deep = 6 game hours (6 minutes human time).
  - User Actions are disabled during sleep.
- **Dancing**
  - The pet dances to a song played from a "Radio" within the app.
    - The Radio includes a play/stop button and loads/playback a single royalty-free song from the web.
  - Create a `eventListener` that looks for an active audio source coming from the user's system.
- **Whining**
  - Triggered when any vital metric is in the "Critical/Low" range.
  - Displays a UI notification.

## User Actions
| UI              | Function                  |
| --------------- | ------------------------- | 
| Feed            | Triggers pet "eating" sequence
|                 | Decreases pet hunger counter by ? amount
|                 | Increases pet weight counter by ? amount
|                 | Increases pet mood counter by ? amount
|                 | Increases pet energy counter by ? amount
|                 | Increases pet poop counter by 1
| Play            | Triggers pet "playing" sequence
|                 | Increases pet hunger counter by ? amount
|                 | Decreases pet weight counter by ? amount
|                 | Increases pet mood counter by ? amount
|                 | Decreases pet energy counter by ? amount
| Sleep           | Triggers pet "sleeping" sequence
|                 | Increases pet hunger counter by ? amount
|                 | Decreases pet weight counter by ? amount
|                 | Increases pet mood counter by ? amount
|                 | Increases pet energy counter by ? amount
| Clean           | Triggers removal of pet poop
|                 | Increases pet mood counter by ? amount

## Additional Features
- **Keepsake Feature:** Upon death, use `html2canvas` to allow the user to export a summary card of their pet's final stats and appearance as a JPG image.
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
|          | weight    | number        | Calculated as an enum (gaunt to fat) based on value.      |
| Hidden   | fitness   | number        | Tracks play frequency.                                    |
|          | attention | number        | Tracks user response speed.                               |
| System   | status    | enum          | "IDLE, EATING, PLAYING, SLEEPING, VOMITING, DEAD."        |
|          | lastTick  | timestamp     | "Used to calculate ""Away Time"" upon re-opening the app."|
|          | poopCount | number        | "Resets at 3 to trigger ""Poop"" event."                  |

## Finite State Machine (FSM) & Game Loop Logic
The "Engine" runs on a **Delta-Time Loop**. Instead of just counting seconds, it calculates how much "Game Time" has passed since the last update.

  ### **Tick Cycle** (every 1 human second)
  - 1. Calculate Delta: `const deltaMinutes = (Date.now() - lastTick) / 1000;`.
  - 2. Apply Decay:
    - Hunger: Increases by `1 * deltaMinutes` (if not sleeping).
    - Energy/Mood: Decreases by `1 * deltaMinutes` (if not sleeping).
  - 3. Check Phase Evolution: If `age` reaches the next threshold (e.g., 2.5 years for a Fox), trigger the _Phase Transition_.
  - 4. Check Special Condition: At the end of the "Adult" phase, run the [Caretaker Score Formula](#caretaker-score-formula)
    - If `score ≥95`, transition to `Special` phase
    - Else, transition to `Death` (old age).
    
  ### State Transition Constraints
  To prevent logic errors (e.g., a pet eating while asleep), the Finite State Machine (FSM) follows these rules:
  - **Interrupts**: Any active animation/status (Eating, Playing) must complete or be timed out before `status` returns to `IDLE`.
  - **Action Looking**: While status is `SLEEPING` or `PLAYING`, all user action buttons (Feed, Play, Clean) are disabled in the UI.
  - **Death Trigger**: If `healthPenalties` reach a threshold or `age` exceeds `lifeExpectancy`, the status shifts to `DEAD`, disabling all loops except the _Keepsake Export_.

## APPENDIX
  
  ### Caretaker Score formula
  $\frac{(Mood \times 0.4) + (Hunger_{\text{inverted}} \times 0.3) + (Fitness \times 0.2) + (Attention \times 0.1)}{TotalTicks} \times 100$
  
  ### Things to omit
  1. Aid / Medicine
  2. Social Features
  3. Generations / Inheritance
  4. Skills / Learn new tricks
  5. Audio / SFX

# ! End of Document


<!--## Pet Animation Sequences
- Eating
- Playing
- Sleeping
- Vomiting
- Dancing
- Pooping
- Whining
## UI
## App Folder Structure 
## App Development Process & Task Checklist
### Phase 1 - title
### Phase 2 - title-->
