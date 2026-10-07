# Prickles canon · Patterns pillar · v2.0

The 2 Patterns tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles PT1: Patterns Are Vocabulary

If a class implements a known pattern, name the pattern in the identifier. A Factory is `*Factory`. A Repository is `*Repository`. An Adapter is `*Adapter`. An Observer is `*Observer`. An abstract base is `Abstract*` or marked `abstract` in the language.

Read GoF, Refactoring Guru, or Fowler's PoEAA once so the names mean the same thing across team and code. Do not paraphrase the catalogue. Cite it.

Refuse to introduce a pattern unless the pattern is unmistakable from the requirement. When the pattern is real, name it. When it isn't, don't manufacture one.

If you discover the code already implements a pattern after the fact, rename it to the canonical word. A Repository called `OrderStore` is a missed signal. Rename it `OrderRepository`.

## Prickles PT3: Every Pattern Has a Failure Mode

Before introducing a pattern, read its Consequences (or Cons) section in GoF / Refactoring Guru / the canonical reference. Name the cost out loud in the same paragraph as the choice.

For Singleton, name the mitigation: constructor injection at the boundary, never module-level `getInstance()`. Hidden state becomes explicit dependency.

For Visitor, prefer the type-system answer when the language supports it: sealed sum types, discriminated unions, exhaustiveness checking. Visitor is the fallback for languages that can't double-dispatch.

For Observer, document the cause-and-effect chain. Action at a distance is the documented failure mode. Mitigate with a tracing layer or named events that survive grep.

Refuse to introduce a pattern without naming its failure mode. The Consequences section was honest in 1994. The agent has read it. The rule is to remember.
