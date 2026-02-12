# Borako Scoring Rules

This file documents the scoring rules used by the game.

## 1. Meld Bonuses (7 cards only)

- `RUN` of 7 clean straight cards (no Joker, no misplaced 2): `200`
- `RUN` of 7 with exactly one wildcard (Joker or misplaced 2): `100`
- `SET` of seven `3`: `300`
- `SET` of seven `A`: `300`
- `SET` of seven `2`: `400`

### Dirty Set Halving Rule

For sets, if there is a wildcard (Joker or misplaced 2), bonus is halved:

- `300 -> 150`
- `400 -> 200`

## 2. Team Constraint for 100 Melds

- A `100` meld bonus is **not counted** unless the same team has at least one meld bonus of `200` or more.

## 3. Card Values

- `A` = `1.5`
- `K, Q, J, 10, 9, 8, 2, Joker` = `1`
- `3, 4, 5, 6, 7` = `0.5`

## 4. Round Score Formula

1. Sum team meld bonuses, applying the `100` gating rule.
2. Convert meld bonuses to points by dividing by `10`.
3. Add values of cards inside melds.
4. Subtract values of cards left in players' hands.
5. If team did not take Mour, apply `-10` points.

Notes:

- Existing go-out bonus remains enabled (`+10`) in current implementation.
- Final round points are added to team total score.

## 5. Win Condition

- Game ends when at least one team reaches `350` or above.
- If both teams are `>= 350`, team with higher score wins.
