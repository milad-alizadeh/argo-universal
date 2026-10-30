# The Server Device and paired Devices

An App runs on the Server Device or on a paired Device. Only the Server Device may do the actions that decide who can reach the Server or how the Server Device runs:

- pairing a new Device;
- unpairing another Device;
- Remote access;
- choosing the relay or Tailscale for Remote access;
- keeping the Server running after the desktop app quits (the later setting in ADR-0003).

Everything else works on every Device: Projects, Agents (install and remove included), Accounts and Sessions. This amends ADR-0002's "the phone, the web app, and the desktop app must have the same abilities" for this list only. A lost phone must not be able to unpair the owner's other Devices or turn off Remote access, and a Device away from home that turned off Remote access would cut off its own Connection.

**The Server says where each Connection comes from.** For each Connection, the Server tells the App whether it is on the Server Device and which Device it comes from. The App uses that answer and never guesses from window width, platform or Electron. The Server checks the list above itself, from a per-Connection tRPC context; hiding a row in the App is not the check.

**A paired Device never sees the other Devices.** The Devices page shows only on the Server Device. A paired Device can still unpair itself.

**Settings labels stay minimal.** On the Server Device, Settings is one flat list with no Device headings or captions. On a paired Device, only the Device-only settings (Appearance, and later Notifications) sit under a heading that names this Device, such as "This iPhone"; the platform gives the word (Spec 0010 #412, minor 45). No page has a "Server · <name>" heading or an "On <name>" caption. A Project's Device field stays, and shows only when the Project is on another Device.

**One App can talk to several Servers.** An App holds one Connection per Server. A Server's id is its Server Device's id, since one Server runs per Server Device. This replaces "one Connection per App" (`packages/client/src/app-providers.tsx`) and the "one Connection" that a Server switch replaces in ADR-0009. Preferences that a Device stores for a Server's data, such as an Agent's New Sessions defaults, are kept per Server.

Still deferred:

- **Notifications:** whether a Device's choices are stored on the Device or on the Server (which a push to a sleeping phone needs), and whether a paired phone's Settings list gets the row.
- **The relay.**

[ADR-0045](0045-pairing-gives-every-device-its-own-key.md) (owner, 2026-10-30) is the pairing and authentication protocol this ADR deferred, and it replaces the deferral above: "the pairing and authentication protocol: its own ADR, as ADR-0002 says. Until then the Server binds `127.0.0.1`, every Connection is on the Server Device, and no paired Device exists." A Device now pairs with a single-use Pairing Ticket and authenticates afterwards with its own Device Key, so the Server's per-Connection answer to "is this the Server Device, and which Device is it" comes from the authenticated credential rather than from the socket's address. Unpairing is one row deleted and closes that Device's open Connection. The list of Server-Device-only actions above is unchanged; ADR-0045 only says how the Server knows, and adds that keeping the Server running after the desktop app quits ships with Pairing rather than later, because otherwise quitting a window makes a paired phone read as broken. Notifications and the relay stay deferred.

## Considered Options

- Key Settings on window width, as the code did. Rejected: a narrow browser on the Server Device counted as a phone, and a wide paired MacBook would count as the Server Device.
- Let the App guess from its platform (Electron means the Server Device, native means paired). Rejected: web on the Server Device and web through a relay both break it.
- The same abilities everywhere, as ADR-0002 is written. Rejected for the list above, for the lost-phone reason.
- A read-only Devices page on a paired Device. Rejected: a paired Device has no need to know the others.
- A "Server · <name>" heading and "On <name>" captions. Rejected: they repeat the obvious on the Server Device, and the Project Device field names the place where it matters.
