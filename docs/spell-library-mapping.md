# Ink Grimoire Arena Spell Mapping

The battle layer keeps canon-derived research separate from public-facing game
names. `name` is the working library name, `publicName` is the replaceable
original alias, and `libraryComponents` is the mechanical recipe used by the UI.

Source metadata:

- `src/data/signs.json`, scraped from Telepedia's **Signs Explained**
- `src/data/sigils.json`, scraped from Telepedia's **Sigils Explained**
- `public/vectors/signs` and `public/vectors/sigils`, local traced references

| Working spell | Public alias | Library recipe | Formation logic |
| --- | --- | --- | --- |
| Flame Shot Seal | Cinder Lance | Fire + Column + Region | Fire supplies flame, Column projects it, and Region stabilizes the launch boundary. |
| Watershot Seal | Tideburst | Water + Column | Water supplies the pulse and Column projects it as a directed shot. |
| Rising Platform of Water | Springstep Dais | Water + Column + Levitation | Water forms the platform, Column establishes upward direction, and Levitation suspends it. |
| Wind Wall | Gale Ward | Wind + Column + Convergence | Wind moves air, Column raises the barrier, and Convergence holds the flow together. |
| Sand Cage | Dune Bind | Earth + Column + Crush | Earth manipulates sand, Column raises it, and the documented inverted Crush variant closes it inward. |
| Sylph Shoes Seal | Zephyr Treads | Wind Underfoot + Levitation + Convergence | Wind Underfoot supports the caster, Levitation lightens movement, and Convergence anchors the current. |
| Light Beam | Dawnline | Light + Column | Light supplies the medium and Column focuses it into a beam. |
| Pyreball Seal | Ember Comet | Fire + Levitation | Fire creates the burning mass and Levitation suspends it for launch. |

## Confidence Notes

- The component lists above are taken from each sign or sigil's `spellsUsing`
  entries in the scraped library.
- Sand Cage's Crush relationship appears as `Sand Cage (Inverted)` in the
  source data, so the game explicitly describes it as an inverted formation.
- The game assembles the source components inside an original ring layout. This
  preserves research traceability without coupling combat code to one final art
  treatment or public naming scheme.
