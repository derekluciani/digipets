# Digipets | Product Requirements Document

## 1. Objective
Build a functional **Tamagotchi-inspired Web App** using React and Zustand. The application operates as a **real-time finite state machine**, where pet state is driven by a delta-time loop (accounting for time decay) and direct player intervention.

## 2. Technical Stack
*   **Frontend:** Vite + React (TypeScript)
*   **State Management:** Zustand (with `persist` middleware for `localStorage`).
*   **Game Engine:** Custom "Delta-Time" loop.
    *   *Concept:* Calculates `deltaGameMinutes` between the last saved timestamp and current time to sequentially apply decay and evolution logic.
*   **UI Components:** shadcn/ui
*   **Styling:** Tailwind 4 (CSS Variables)
*   **Assets:** Standard Emojis for all visual states.

## 3. Game Mechanics & Time

### 3.1. Canonical Time Model
Time proceeds linearly. 1 Game Day equals 1 Pet Year.

| Unit           | Game Time | Human Time | Notes                     |
| :------------- | :-------- | :--------- | :------------------------ |
| **Tick**       | 1 min     | 1 sec      | Base simulation unit.     |
| **Hour**       | 60 min    | 60 sec     | Decay interval unit.      |
| **Day / Year** | 24 hrs    | 24 min     | Age increment unit.       |

*   **Day Cycle:** 12 game hours (Day) / 12 game hours (Night).

### 3.2. Pet Life Expectancy
| Pet Type | Life Expectancy (Game Years) | Real-Time Duration |
| :------- | :--------------------------- | :----------------- |
| Fox      | 10 Years                     | 4 Hours            |
| Axolotl  | 15 Years                     | 6 Hours            |

### 3.3. Lifecycle Phases
Phases are determined by `age` (Game Years).
*   **Phase Duration:** (Life Expectancy) / 4.
*   **Special Phase:** Reached if `caretakerScore >= 95` at the end of Adult phase. Adds +5 Years to lifespan.

| Phase | Fox (Years) | Axolotl (Years) |
| :---- | :---------- | :-------------- |
| Baby  | 0 – 2.5     | 0 – 3.75        |
| Toddler| 2.5 – 5    | 3.75 – 7.5      |
| Teen  | 5 – 7.5     | 7.5 – 11.25     |
| Adult | 7.5 – 10    | 11.25 – 15      |

## 4. State Management (Zustand Store)

The store is the Single Source of Truth, persisted to `localStorage`.

### Store Schema

| Category | Key | Type | Description |
| :--- | :--- | :--- | :--- |
| **Metadata** | `petType` | `enum` | `'fox'`, `'axolotl'` |
| | `name` | `string` | User-defined name. |
| | `birthday` | `number` | Creation timestamp (Date.now). |
| | `isRadioPlaying`| `boolean`| Toggles "Dancing" state. |
| **Vitals** | `age` | `number` | Current age in Game Years (floats allowed for internal logic). |
| | `health` | `number` | 0–100. Derived from penalties. |
| | `hunger` | `number` | 0–100. 100 = Starving. |
| | `mood` | `number` | 0–100. 0 = Depressed. |
| | `energy` | `number` | 0–100. 0 = Exhausted. |
| | `weight` | `number` | 0–100. Affects visual state. |
| **System** | `status` | `enum` | `IDLE`, `EATING`, `POOPING`, `SLEEPING`, `PLAYING`, `DANCING`, `VOMITING`, `DEAD` |
| | `lastTick` | `number` | Timestamp of last processed loop. |
| | `poopCount` | `number` | Increments on feed. Triggers `POOPING` at 3. |
| **Hidden (Scoring)**| `cumulativeMood`| `number` | Sum of mood values (per tick). |
| | `cumulativeHunger`| `number` | Sum of (100 - hunger) values. |
| | `cumulativeFitness`| `number` | Sum of play interactions. |
| | `cumulativeAttention`|`number` | Sum of interaction speeds. |
| | `totalTicks` | `number` | Total game minutes played. |
| **Timers** | `hungerTime` | `number` | Minutes `hunger === 100`. |
| | `moodTime` | `number` | Minutes `mood <= 10`. |
| | `dirtyTime` | `number` | Minutes since `isDirty` became true. |
| | `healthPenaltyPoints` | `number` | Accumulates based on neglect. |

### Derived States (Computed)
*   **`isDirty`**: `boolean` (True if `status === POOPING` or `dirtyTime > 0` until cleaned).
*   **`isSick`**: `boolean` (True if `healthPenaltyPoints` > threshold).

## 5. Logic & Mechanics

### 5.1. Decay (Per Game Minute)
Unless sleeping (`status === SLEEPING`):
*   `hunger` +1
*   `energy` -1
*   `mood` -1

### 5.2. Health & Penalties
*   **Neglect Conditions:**
    1.  `hunger === 100`
    2.  `mood <= 10`
    3.  `poopCount >= 3`
    4.  `dirtyTime >= 60`
*   **Penalty Logic:**
    *   Active neglect condition: +1 `healthPenaltyPoints` per 60 game minutes.
    *   Damage: Every 5 `healthPenaltyPoints` -> `health` -5.
    *   Recovery: No neglect conditions -> `healthPenaltyPoints` -1 per 120 game minutes.

### 5.3. Death Conditions
Death occurs (`status = DEAD`) if:
1.  `age` >= Life Expectancy (and not qualified for Special phase).
2.  `health` <= 0.
3.  `hunger === 100` for > 720 min (12 hrs).
4.  `mood <= 10` for > 720 min.

## 6. User Actions

| Action | Effects |
| :--- | :--- |
| **Feed** | `hunger` -20, `weight` +10, `mood` +5, `energy` +5, `poopCount` +1 |
| **Play** | `hunger` +15, `weight` -15, `mood` +20, `energy` -20 |
| **Sleep** | `hunger` +10, `weight` -5, `mood` +10, `energy` +40 |
| **Clean** | `mood` +15, Reset `dirtyTime` to 0, Reset `poopCount` to 0 |

## 7. Visual States (Expressions)
Determined by metrics. Purely visual, does not block logic.
*   **High/Whining:** `hunger >= 90` OR `energy <= 10` OR `energy >= 90` OR `dirtyTime >= 60`.
*   **Angry:** `hunger === 100` (>180 min) OR `mood === 0` (>180 min).
*   **Sick:** `health <= 50`.
*   **Sad:** `mood <= 33`.
*   **Happy:** `mood >= 68`.

## 8. Caretaker Score
Calculated at Death.
**Formula:**
$$
\frac{(\text{AvgMood} \times 0.4) + (\text{AvgSatiety} \times 0.3) + (\text{Fitness} \times 0.2) + (\text{Attention} \times 0.1)}{\text{TotalTicks}} \times 100
$$
*   *AvgSatiety* = Average of (100 - hunger).

## 9. Feature Roadmap
1.  **Project Init:** Vite, Tailwind, Shadcn.
2.  **Engine:** Zustand store + Delta-time loop.
3.  **Game Logic:** Decay, Aging, Penalties.
4.  **UI Implementation:** Main screen, Vitals, Actions.
5.  **Save/Load:** Persistence & Offline calculation.
6.  **Death & Scoring:** End screen & `html2canvas` export.
