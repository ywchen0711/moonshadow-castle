# 月影城：夜之狂想曲 · Moonshadow Castle

A gothic exploration action game in the spirit of *Castlevania: Symphony of the Night*. Play it in the browser: Chinese and English, keyboard or touch.

Every hundred years the moon turns black above Moonshadow Castle, and Count Vorlath awakens to make the night endless. He has taken Elise, the last moon priestess. Her brother Lucien walks in alone.

## Features

- **A castle the size of Symphony of the Night's.** It has 339 rooms in 20 areas. The original five areas are joined by the Alchemy Lab, Abandoned Mine, Marble Gallery, Moonlit Garden, Outer Wall, Forge, Duke's Quarters, Belfry, Royal Chapel, Colosseum, Crystal Caverns, Frozen Vault, Treasury, Underground Waterway and the Abyss. There are warp rooms, extra shops, secret walls and hidden upgrades in dead ends.
- **The Reversed Castle:** the Eye of the Moon turns the whole castle upside down. That is 339 more rooms with tougher monsters (+25 levels, −40% resistances), better loot, and the true final boss behind the true ending.
- **8 relics that open new paths:**
  - Leap Stone (double jump), Shadow Cloak (slide) and Bat Wing (flight);
  - the Echo Bat (shows warp rooms on the map) and a Faerie companion who heals you;
  - Mist Form, to drift through grates;
  - the Snorkel, to swim in deep water;
  - the Eye of the Moon.
- **Diablo II style loot:**
  - **100 base items in 20 classes.** Daggers, swords, rapiers, greatswords, axes, maces, hammers, spears, katanas, whips, shields, helms, armour, cloaks, gloves, boots, amulets, rings and **12 sub-weapons**. The sub-weapons are throwing knives, axes, holy water, the cross, the Bible, a boomerang, a javelin, fire bombs, shuriken, a stopwatch, a lightning orb and a crystal.
  - **Six qualities:** normal, superior, magic (blue), rare (yellow), set (green) and unique (gold). Item level, required level, and prefix/suffix affixes in tiers. Elemental damage, resistances, life/mana steal, crit, block, magic find, faster run, thorns and more.
  - **64 uniques** and **8 sets (34 pieces)** with 2-piece, 3-piece and full-set bonuses.
  - **Sockets and gems.** 7 gems × 4 grades, with different effects in weapons and armour. Combine 3 gems into the next grade at the shop.
  - **Special effects on weapons:** Deadly Strike (double damage), Crushing Blow (a quarter of the enemy's life), Open Wounds (bleeding), Paralysis, Freezing, Ignore Defense, Knockback, poison and life/mana steal. They come as affixes and on 8 uniques built around them, such as Skullsplitter, Bloodthirster, Viperfang and Earthshaker. Enemies show their state: paralysis stars, an ice block, dripping blood, green poison.
  - **Monster drops:** every species has a normal drop (6%) and a rare drop (2%: a rare item of one base).
  - **Elite forms (強敵):** now and then one monster in a room is its species' elite form: 25% bigger, red aura, 6× life, one random power, 8× EXP. It has two more drops of its own: an elite normal drop (50%, a gem matching the monster) and an elite rare drop (12%, a unique that is different for every species). Magic find raises the rare chances.
  - **Champion and unique monsters** with random modifiers and better drops.
- **RPG growth:** levels to 99, and 3 stat points per level for STR / CON / INT / LCK. Equip 11 slots on a paper doll: weapon, shield, helm, armour, cloak, gloves, boots, amulet, two rings and a sub-weapon. You get a 60-slot bag, a 120-slot stash in save rooms, and an item card that compares each item with what you wear.
- **Shops:** buy potions and rolled gear, sell, **gamble** for mystery items, and combine gems.
- **Gallery (圖鑑):** open it from the title screen or the pause menu.
  - Every monster (39) and boss (21), with its real sprite, stats, element and resistances, and where it lives. Each monster also shows its four drops (normal, rare, elite normal, elite rare) with their chances, and its elite form.
  - Every base item (100), unique (56) and set piece (34), plus relics, potions and all 28 gems.
  - Things you have defeated or found are marked and counted. Anything not met or found yet is shown only as a shadow (？？？).
- **39 monster types and 21 bosses**, each boss with its own pattern. Examples: the Chimera, Spider Queen, Doppelganger, Treant, Minotaur, Scylla, Frost Wyrm, Mimic King, Kraken, Reaper and the Moon Sovereign.
- **Save rooms** fully heal you and save your progress, which syncs to the cloud through the Pixel Playground account. There is a full story with dialogue, an ending and a true ending.
- **Look and sound:** procedural pixel art, a parallax moonlit sky, and a synthesized soundtrack for each area.

## Controls

| | Keyboard | Gamepad (Xbox / PS / Switch Pro) | Touch |
|---|---|---|---|
| Move / crouch | ← → / ↓ | d-pad / left stick | stick |
| Jump (again in the air: double jump) | Z / Space | A / ✕ | 跳 / Jump |
| Attack | X | X / □ | 攻 / Atk |
| Sub-weapon | ↑ + X, or C | Y / △ (or ↑ + X) | 副 / Sub |
| Backdash | A | B / ○ | 退 / Dash |
| Bat form | S | LB | 蝠 / Bat |
| Mist form (with the relic) | D | RB | 霧 / Mist |
| Drop through a ledge / slide | ↓ + jump | ↓ + A | |
| Menu / map | Enter / M | Start / Back | ☰ / 🗺 |

In the menus, shop, gallery and title screen, the arrow keys or d-pad move the highlight to the nearest item in that direction. For example, ↓ goes from the equipment slots straight into the bag list. Z / Space / gamepad A chooses, and X / Backspace / gamepad B goes back. Taking damage makes the controller rumble (Chrome / Edge).

## Development

Plain ES modules: no build step. Serve the folder and open `index.html`.

```
npm test        # node tools/check.mjs && node tools/test.mjs && node tools/audit.mjs
```

- `tools/check.mjs` stitches every room into one tile grid and checks progression. It tests each relic set with both cautious and generous jump numbers. Each relic must be reachable with the relics found before it, every gate must hold, and there must be no dead ends.
- `tools/test.mjs` drives the real game logic. It checks:
  - jump heights;
  - every gate (double jump, slide, bat flight) and climbing back out of the catacombs;
  - combat and levelling, items, the shop and saving;
  - that every boss can be beaten;
  - loot rolls, equipping, sockets and gems, gambling and the stash;
  - deep water, warp rooms, the Reversed Castle portal and the true ending;
  - gallery tracking and saving (including migration of version 1 saves).

`tools/audit.mjs` runs the real game physics through the whole castle:
- climbs every stairwell and shaft (with the relic each one needs);
- drops through every hole;
- walks through every door both ways, including the slide, breakable-wall, grate, deep-water and boss-seal gates;
- flags any place where standing would put you in the next room;
- checks that every item, relic, candle, save statue and the shop is in open space and within reach.
