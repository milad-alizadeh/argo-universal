# A Screen frames its page with an aside, bleed and a footer

A Plugin page was a `Screen` with a reading column, and a `Detail` that carried its own properties. The Detail widened the column when its properties sat beside it, so opening an Issue moved its title and changed the body's width, and a Plugin that wanted a full-bleed board or a chat with a pinned input had no way to say so. [ADR-0043](0043-a-screen-declares-its-header-once.md) gave the Screen the page's header; this gives it the rest of the page's frame.

## Decision

- **`Screen.aside` holds the page's one `Metadata`.** The Screen decides where it draws from its own measured width: a column at the trailing edge when both sides of the centred column have room for it, a wrapping row of Pills between the title and the body when they do not, and Pills that show their icon alone below medium. The aside never moves the column, so the title and the body keep their place at every width.
- **`Detail` loses its metadata slot.** It holds the body, its loading skeleton and its sections. A Detail that leads its own scroll content draws the aside's Pills at its top, so they scroll with the body; the old beside, stacked and inline layouts are deleted.
- **`Screen.width` gains `bleed`.** The page has no column and no inset, and a `Canvas` in its body fills it instead of keeping its aspect ratio.
- **`Screen.footer` stays pinned under the body and rises with the keyboard.** It takes a `TextArea`, a `Stack` or a `Button`, so a chat Plugin draws its input as the Composer does.
- **Plugins choose none of the sizes.** They say what the page holds; the kit lays it out on every platform.

## Considered Options

- **Keep the properties in Detail and stop widening the column.** Rejected: a Detail cannot measure the Screen's room, and a page without a Detail, such as a board, has properties too.
- **Let a Plugin pick the aside's place.** Rejected: the place depends on the window, the sidebar and the Inspector, which a Plugin cannot see, and a wrong pick is what made the title jump.
