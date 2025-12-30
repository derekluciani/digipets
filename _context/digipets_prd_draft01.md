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
* All user interactions and state transitions respond in real time. 
* The app runs with command: `npm run dev` 

## Tech Stack  
* **Frontend:** Vite + React  
* **State Management:** React Context API  
<!--* **Audio Engine:** ???-->
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
| Game Time     | Human Time      |
| ------------- | --------------- | 
| 1 min         | 1 sec           |
| 1 hr          | 1 min           |
| 12 hrs        | 12 min          |
| 24 hrs        | 24 min          |
| 2.5 days      | 1 hr            |

## Day/Night Cycle
- Day time: 12 game hours
- Night time: 12 game hours

## Pet Life Expectancy
A pet age is to be listed in years. The number of game days is equivalent to pet years. Example: 1 game day = 1 pet year.
| Pet Type   | Life Expectancy     |
| ---------- | ------------------- |
| Fox        | 10 years            |
| Axolotl    | 15 years            |

Logic: The pet historical health stats should determine the end of life (death) moment. Example: If the pet lived a healthy life, there should be a higher probability of the pet reaching an age higher than the expectancy. 

## Pet Lifecycle
| Phase   | Name         | Game Time Duration*        |
| ------- | ------------ | -------------------------- |
| 1       | Baby         | (pet life expectancy) / 4  |
| 2       | Toddler      | (pet life expectancy) / 4  |
| 3       | Teen         | (pet life expectancy) / 4  |
| 4       | Adult        | (pet life expectancy) / 4  |
| 5       | Special**    | (pet life expectancy) + 5  |

  ### Special phases
  * **Birth** occurs immediately at the start of a pet life.
  * **Death** occurs immediately at the end of a pet life. Death can happen from any phase (with the exception of the baby stage) either through neglect or old age. When a pet dies, the user will see their pet final stats and the option to export an image as a keepsake.
  ### Table footnotes
  - *Game Time Duration example: A Fox's Baby Phase will have a duration of 2.5 game days.
  - **Special phase: A pet can only reach this phase if the following conditions are met: **TBD**

## Pet Health Metrics
The purpose of these metrics is to capture the pet real-time health status. The user will use this information to make informed decisions that will impact the pet state of being.

  ### Global standards
  - All number-based metrics are essentially counters with a range between 0–100.
  - All counters (except for 'Age' and 'Hunger') gradually decreases in real-time.
  - **TBD**: Need to define the criteria that determines a pet health outcome as either _Positive_ or _Negative_.
    - _Positive_ health outcomes increase probability of a pet reaching a longer life expectancy age.
    - _Negative_ health outcomes increase probability of a pet reaching death before life expectancy age.

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
    
## Pet Behaviors
- **Eating**
  - The pet will eat if their hunger counter >=1.
- **Pooping**
  - The pet will poop after being fed 3 times. When a pet poops, the "fed" counter resets to 0.
- **Vomiting**
  - If Hunger counter value remains at 100 for 6 game hours, the pet will eat a random household item, causing it to vomit.
  - The pet will vomit if fed 6 times in 6 seconds or less (human time).
- **Idle**
  - The pet has 2 different idle sequences: 
    1. Standing
    2. Watching TV
    - Sequences are chosen at random.
      - Assigned probabilities: _Standing_=0.7, _Watching TV_=0.3
- **Playing**
  - The pet has 2 different play sequences:
    1. Jumping
    2. Chasing toy
  - Selecting the "play" function should randomize the chosen outcome.
    - Assigned probabilities: _Jumping_=0.5tg, _Chasing toy_=0.5
  - A pet play sequence will have a duration of 1 game hour.
  - User Actions are disabled during play. 
- **Sleeping**
  - If the pet sleeps during 'Day time', it is considered a nap and will last `30 game minutes` before waking.
  - If the pet sleeps during 'Night time', it is considered deep sleep and will last `6 game hours` before waking.
  - User Actions are disabled during sleep.
- **Dancing**
  - The pet will dance if it hears music being played from the user's computer.
  - Create a `eventListener` that looks for an active audio source coming from the user's system.
- **Whining**
  - If the pet is in need of something, they will make a sound as a _call for attention_.  

## User Actions
| Name            | Function                  |
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

## Things to omit from the App
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
