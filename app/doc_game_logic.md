# DigiPet Game Logic Documentation

This document outlines the core mechanics, rules, and logic that govern the DigiPet simulation.

## 1. Time and Progression

-   **Game Clock**: The game runs on a 24-hour clock, composed of 1440 minutes per day.
-   **Time Speed**: 1 game minute passes every **0.25 real-world seconds**.
-   **Aging**: 1 full game day (1440 minutes) equals 1 year of the pet's life.
-   **Day/Night Cycle**:
    -   **Daytime**: 6:00 AM to 9:59 PM.
    -   **Nighttime**: 10:00 PM to 5:59 AM.

---

## 2. Pet Vitals

All vitals are measured on a scale of 0-100.

### Hunger
-   `100` is completely starving.
-   `0` is completely full.
-   **Natural Decay**: Increases by `1` every hour (unless sleeping).
-   **Actions**:
    -   `Feed`: Decreases hunger by `10`.

### Mood
-   `100` is happiest.
-   `0` is saddest.
-   **Natural Decay**: Decreases by `1` every hour (unless sleeping).
-   **Actions**:
    -   `Feed`: Increases mood by `5`.
    -   `Sleep`: Increases mood by `15`.
    -   `Clean`: Increases mood by `10`.
    -   `Dancing`: Increases mood by `5` per hour.

### Energy
-   `100` is fully rested.
-   `0` is exhausted.
-   **Natural Decay**: Decreases by `1` every hour (unless sleeping).
-   **Actions**:
    -   `Feed`: Increases energy by `5`.
    -   `Sleep`: Increases energy by `5` per hour.
    -   `Dancing`: Decreases energy by `5` per hour.
    -   `Play`: Pet will automatically stop playing if energy drops to `33` or below.

### Health
-   `100` is perfect health.
-   `0` results in death.
-   **Decay**: Decreases based on penalties (see [Health and Penalties](#health-and-penalties)).
-   **Recovery**: If no penalties are applied in an hour, health recovers by `1`.

### Weight
-   `100` is max weight.
-   `0` is min weight.
-   **Actions**:
    -   `Feed`: Increases weight by `10`.
    -   `Sleep`: Decreases weight by `5`.
    -   `Dancing`: Decreases weight by `1` per hour.

---

## 3. Pet States & Status

### Core Statuses
-   **Idle**: The default state.
-   **Eating**: Occurs after `Feed` action. Lasts for **12 game minutes**.
-   **Pooping**: Occurs after 3 meals. Lasts for **10 game minutes**, then the pet becomes Dirty.
-   **Vomiting**: Occurs when `hungerTime` (overfed) reaches **180 minutes**. Lasts for **5 game minutes**, then the pet becomes Sick and Dirty.
-   **Playing**: Occurs after `Play` action.
    -   **Effect**: Increases Mood by `5` per hour. Decreases Energy by `5` per hour.
-   **Sleeping**:
    -   Can be initiated by the player.
    -   Wakes up automatically after **60 game minutes (day)** or **360 game minutes (night)**.
-   **Dancing**: Occurs when the radio is on and the pet is not in another state.
    -   **Effect**: Increases Mood by `4` per hour. Decreases Energy by `6` per hour. Increases Hunger by `6` per hour. Decreases Weight by `1` per hour.
-   **Dead**: The final state.

### Flags (Conditions)
-   **isDirty**: Becomes true after Pooping or Vomiting. Causes health penalties if not cleaned. Player must use `Clean` action.
-   **isSick**: Becomes true after Vomiting.
    -   **Effect**: Stats drop to `10` (Hunger, Mood, Energy). Causes health penalties.
    -   **Cure**: Pet must be **Cleaned** AND **Put to Sleep**.
-   **isWhining**: An indicator that the pet needs attention. Occurs when:
    -   Hunger is `90` or greater.
    -   Energy is `10` or lower.
    -   Mood is `0` for `180`+ minutes.
    -   Mood is `10` or lower.
    -   *The time spent whining is tracked for the Caretaker Score.*

---

## 4. Health and Penalties

Every hour, the game checks for neglect conditions. Each condition met applies **1 penalty point**, which reduces `healthPoints` by `1`.

-   **Starvation**: Hunger is `100` OR `starvingTime` (hunger >= 90) is `180`+ minutes.
-   **Overfeeding**: `hungerTime` (hunger <= 10) is `180`+ minutes.
-   **Sickness**: The pet is `Vomiting` OR `sickTime` is `180`+ minutes.
-   **Poor Hygiene**: `dirtyTime` is `180`+ minutes.
-   **Emotional Neglect**: Mood is `0` AND `moodTime` (mood <= 10) is `180`+ minutes.
-   **Extreme Weight**: Weight is `0` OR `100`.

If no penalties are accrued in an hour, health recovers by `1`.

---

## 5. Death Conditions

A pet will die if any of the following conditions are met:

-   **Sickness**: `healthPoints` reach `0`.
-   **Starvation**: `hunger` remains at `100` for `720` consecutive game minutes (12 game hours).
-   **Depression**: `mood` remains at or below `10` for `720` consecutive game minutes (12 game hours).
-   **Old Age**: The pet reaches its `lifeExpectancy` and does not qualify for the Special Phase.
-   **End of Extended Life**: The pet reaches its extended `lifeExpectancy` after being in the Special Phase.

---

## 6. End of Life & Caretaker Score

When a pet reaches its natural `lifeExpectancy`, a **Caretaker Score** (0-100) is calculated.

-   **Qualifying for Special Phase**: If the score is **95 or higher**, the pet enters a "Special Phase" and its `lifeExpectancy` is extended by **5 years**.
-   **Normal Death**: If the score is below 95, the pet dies of old age.

The score is a weighted average based on:
-   **Vitals at Death**: Final `mood`, `health`, and inverted `hunger`.
-   **Lifetime Fitness**: A score based on the percentage of its life spent playing.
-   **Lifetime Attention**: A score based on how little time it spent whining.

| Grade | Score Range |
| :---: | :---------: |
|   A   |   90–100    |
|   B   |    80–89    |
|   C   |    70–79    |
|   D   |    60–69    |
|   F   |    0–59     |

---

## 7. Key Game Constants

| Constant | Value | Description |
| :--- | :---: | :--- |
| `MINUTES_PER_DAY` | 1440 | Game minutes in a day (equals 1 pet year). |
| `REAL_SECONDS_PER_GAME_MINUTE` | 0.25 | Real seconds for one game minute to pass. |
| `DECAY_INTERVAL` | 60 | Interval in minutes for hourly decay/penalty checks. |
| `NIGHT_START_MINUTE` | 1320 | 10:00 PM |
| `NIGHT_END_MINUTE` | 360 | 6:00 AM |
| `HUNGER_STARVING` | 90 | Hunger threshold for `starvingTime` to increase. |
| `HUNGER_FULL` | 10 | Hunger threshold for `hungerTime` (overfed) to increase. |
| `MOOD_LOW` | 10 | Mood threshold for `moodTime` to increase. |
| `MOOD_ANGRY_TIME`| 180 | Minutes at `mood=0` to trigger penalty. |
| `LIFE_EXPECTANCY` | 10 | Base lifespan in years for a Fox. |
| `EATING_DURATION_MINUTES` | 12 | How long the pet stays in the "Eating" state. |
