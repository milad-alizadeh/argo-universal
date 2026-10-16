# Argo runs on iOS 18 and macOS 15 and later

The iOS App needs iOS 18.0 and the desktop App on macOS needs macOS 15.0 (owner, 2026-10-16). Until now Argo set no minimum and took the frameworks' own: iOS 16.4 from the Expo SDK and macOS 13.0 from Electron 44. Those limited Plugin icons to SF Symbols 4.1, a 2022 set, because a newer symbol draws blank on an older system (ADR-0025).

## Decision

- **The builds set the minimums.** `expo-build-properties` sets the iOS deployment target to 18.0, and the desktop App's `Info.plist` sets `LSMinimumSystemVersion` to 15.0, so an older system cannot install Argo.
- **SF names stay within SF Symbols 6.0,** the release iOS 18.0 and macOS 15.0 both ship. This holds for Argo's own icons (ADR-0019) and for Plugin icons (ADR-0025).
- **A higher minimum is a new decision.** Raising it lets in newer SF Symbols and drops older devices, so it is weighed against usage numbers like the ones below.

## Usage when this was decided

| Minimum | SF Symbols | iPhones and iPads covered | Developer Macs covered |
| --- | --- | --- | --- |
| iOS 16.4 / macOS 13 | 4.1 | about 100% | about 98% |
| iOS 17 / macOS 14 | 5.0 | about 99% | about 97% |
| **iOS 18 / macOS 15** | **6.0** | **about 98%** | **about 93%** |
| iOS 26 / macOS 26 | 7.0 | about 91% | about 72% |

iOS shares are TelemetryDeck's for the end of September 2026. Mac shares are Homebrew's analytics for the 30 days to 16 October 2026, which stand in for developers' Macs. Both are rough.

## Considered options

- **Keep the frameworks' minimums.** This reaches about 5% more developer Macs, but Plugin authors would get only the 2022 symbol set.
- **iOS 26 and macOS 26.** This gives SF Symbols 7, but loses about a quarter of developer Macs, including every Intel Mac but four.
- **Accept every SF name and fall back at runtime.** macOS reports a missing symbol, but iOS draws nothing and reports nothing, so the App cannot tell when to fall back.
