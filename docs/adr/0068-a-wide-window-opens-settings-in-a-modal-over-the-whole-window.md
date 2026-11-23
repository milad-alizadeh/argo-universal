# A wide window opens Settings in a modal over the whole window

Settings used to take the Frame the way Sessions and Scheduled do: its list replaced the sidebar, and its page replaced the page pane. That made changing a setting a trip away from your work. Codex and ChatGPT open settings over the app instead. The owner chose that for a wide window, with the whole window dimmed, and asked that phones keep Settings as they are and that no screen or route is reworked to get there (owner, 2026-11-23).

## Decision

- **On a wide window, Settings is a Settings modal.** It is a Centred modal over the whole window, with the rail and sidebar dimmed too. It holds Settings' list beside its open page, as [ADR-0042](0042-field-groups-and-lists-are-separate-kit-components.md) draws the wide list. Underneath, the Frame keeps the nav item the person left: its list, its page and its URL state. Escape, the close button, or a press on the dimmed window returns to that nav item exactly as it was. Settings' rail tile stays in the rail and opens the modal.
- **On a phone, nothing changes.** Settings stays a nav item in the drawer, and its pages push over its list with Back.
- **Routes and screens stay as they are.** `/settings/...` remains one stack in the Frame's drawer, so links, deep links and a window that narrows or widens keep the open page. Only the Frame changes. A nav item declares how a wide window presents it, either as a page or as a modal, and the Frame draws a modal nav item over the nav item it keeps underneath. Settings is the only modal nav item. Settings screens and Plugin Settings pages never learn they are in a modal.
- **The close button belongs to the modal, not to the page.** It sits in a place no page header's Actions can take, because the spike's close button covered Agents' search action.

## Considered options

- **A root-stack modal route for Settings.** This is Expo Router's usual way to show a modal. It was rejected because phones would lose the drawer's ☰ and the edge swipe, and Settings would need a second set of routes or would change on the phone.
- **Dim only the page pane, or keep the rail live.** These were Paper options B and C. The owner chose the whole window, as Codex does.

## Consequences

- The Frame's drawer keeps screens attached on wide windows, so the nav item underneath can show through. Screens that are neither shown nor underneath are hidden. Narrow windows keep the drawer's existing detachment behavior.
- A rail press while the modal is open lands on the dimmed window and closes the modal. The rail only works again once the modal has closed. The end-to-end scenarios that leave Settings through the rail have to change to match.
