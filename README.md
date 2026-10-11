# 月影城：夜之狂想曲 · Moonshadow Castle

A gothic exploration action game in the spirit of *Castlevania: Symphony of the Night*. Play it in the browser: Chinese and English, keyboard or touch.

Every hundred years the moon turns black above Moonshadow Castle, and Count Vorlath awakens to make the night endless. He has taken Elise, the last moon priestess. Her brother Lucien walks in alone.

## Features

- **One connected castle** with 37 rooms in five areas: Entrance Hall, Underground Catacombs, Long Library, Clock Tower and Castle Keep. Explore it freely, with a map screen that tracks how much you have explored.
- **Relics open new paths.** The Leap Stone gives a double jump, the Shadow Cloak a slide through crawlspaces, and the Bat Wing lets you fly as a bat (uses MP). You will also find a secret wall to break.
- **RPG growth:** levels and EXP, STR / CON / LCK, weapons, armour and rings, potions, max-HP / MP / heart upgrades, gold, and a librarian's shop that buys and sells.
- **Combat:**
  - Sword swings with real reach (each weapon is different), crouch attacks and air attacks.
  - A backdash with brief invincibility, damage numbers and critical hits.
  - Sub-weapons that cost hearts: dagger, axe, holy water and cross. Use them with ↑ + attack.
- **9 enemy types:** bats, zombies, skeletons, bone throwers, ghosts, flying tomes, armour knights, Medusa heads and gargoyles.
- **5 bosses with their own patterns:**
  - the Giant Bat;
  - the Bone Golem, with shockwaves and falling debris;
  - Morrigan the Witch, with teleports and lightning pillars;
  - the Iron Sentinel, with charges and gear storms;
  - Count Vorlath, whose second phase brings meteors and a blood beam.
- **Save rooms** (red coffin statues) fully heal you and save your progress. There is a full story with dialogue and an ending.
- **Look and sound:** procedural pixel art, a parallax moonlit sky, and a synthesized soundtrack for each area.

## Controls

| | Keyboard | Gamepad (Xbox / PS / Switch Pro) | Touch |
|---|---|---|---|
| Move / crouch | ← → / ↓ | d-pad / left stick | stick |
| Jump (again in the air: double jump) | Z / Space | A / ✕ | 跳 / Jump |
| Attack | X | X / □ | 攻 / Atk |
| Sub-weapon | ↑ + X, or C | Y / △ (or ↑ + X) | 副 / Sub |
| Backdash | A | B / ○ | 退 / Dash |
| Bat form | S | LB / RB | 蝠 / Bat |
| Drop through a ledge / slide | ↓ + jump | ↓ + A | |
| Menu / map | Enter / M | Start / Back | ☰ / 🗺 |

With a gamepad, the menus, shop and title screen use the d-pad to move the highlight, A to confirm and B to go back. Taking damage makes the controller rumble (Chrome / Edge).

## Development

Plain ES modules: no build step. Serve the folder and open `index.html`.

```
npm test        # node tools/check.mjs && node tools/test.mjs
```

- `tools/check.mjs` stitches every room into one tile grid and checks progression. It tests each relic set with both cautious and generous jump numbers. Each relic must be reachable with the relics found before it, every gate must hold, and there must be no dead ends.
- `tools/test.mjs` drives the real game logic. It checks:
  - jump heights;
  - every gate (double jump, slide, bat flight) and climbing back out of the catacombs;
  - combat and levelling, items, the shop and saving;
  - that all five bosses can be beaten.
