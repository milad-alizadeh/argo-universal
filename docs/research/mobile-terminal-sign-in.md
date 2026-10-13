# Mobile terminal sign-in

Researched 2026-10-13 for issue #365. Sources are official product documentation, upstream source code, and maintainer comments. Recommendations are marked separately.

## Established mobile interaction

Mobile terminals keep the terminal itself as the input surface. Blink documents typing commands and pressing Return. Its Smart Keys expose modifiers, arrows, and extra keys above the software keyboard. They disappear with a hardware keyboard. Blink supports touch selection and dragging selected text between apps. [Blink quick start](https://docs.blink.sh/)

Termius documents a keyboard add-on directly above the system keyboard. Terminal focus opens the software keyboard. A hardware keyboard hides it. Its iOS terminal supports selection handles, a Copy context menu, and long-press Paste. Its extended keys include Ctrl, Esc, Tab, and arrows. These docs explicitly cover iOS and iPadOS, so they do not establish Android behavior. [Termius mobile terminal](https://docs.termius.com/terminal/mobile-terminal)

Termux implements Android interaction in a native terminal view. A tap requests focus. Dragging scrolls the terminal, and a long press starts text selection. View size changes recalculate the terminal rows and columns. Its input connection handles committed text, composition completion, and deletion requests. It converts software-keyboard newline input to the carriage return expected by a terminal. This is terminal input handling, rather than a submitted command field. [Termux TerminalView source](https://github.com/termux/termux-app/blob/master/terminal-view/src/main/java/com/termux/view/TerminalView.java)

## Rendering and input are separate choices

Blink demonstrates that a web-rendered terminal can have native integration. Its terminal view evaluates JavaScript, receives selection messages, and forwards terminal size changes to its device. Its separate keyboard view adds UIKit accessory controls and tracks hardware keyboards. This supports a hybrid architecture, but does not establish compatibility with xterm.js or React Native. [Blink terminal view](https://github.com/blinksh/blink/blob/raw/Blink/Terminal/TermView.m), [Blink keyboard view](https://github.com/blinksh/blink/blob/raw/Blink/SmarterKeys/SmarterTermInput.swift)

xterm.js has active mobile limitations. In July 2025, maintainers described desktop-oriented event handling and the need for host-provided mobile keys. The issue records a February 2026 touch-scroll fix and later user reports of scroll and IME problems. This evidence does not prove that every current version fails. It does mean that desktop success cannot establish mobile input quality. [xterm.js mobile issue #5377](https://github.com/xtermjs/xterm.js/issues/5377)

React Native WebView supports messages and injected JavaScript. Its iOS keyboard requires user action by default. It also exposes controls for the keyboard accessory and automatic keyboard adjustments. Those controls do not provide a terminal keyboard by themselves. [WebView reference](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)

A hidden React Native TextInput is not a complete terminal adapter. Its Android `onKeyPress` handles software keyboard input only, excluding hardware keys. Android IMEs can also commit text, replace text, and compose characters through `InputConnection`. A terminal adapter must account for these operations without duplicating input. [React Native TextInput](https://reactnative.dev/docs/textinput#onkeypress), [Android input methods](https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method#SendText)

## Recommendation for #365

These are proposed product and implementation choices, inferred from the sources above:

- Desktop: one embedded terminal. Clicking it focuses input, and typing goes directly to the PTY.
- Mobile: one large terminal viewport. Tapping it opens the system keyboard and sends input to the current terminal cursor.
- Add one compact key row above the keyboard: Esc, Tab, Ctrl, arrows, Paste, and Hide Keyboard. Use Return on the system keyboard.
- Keep Cancel outside the terminal. Terminal keys affect the process, while Cancel ends the sign-in flow.
- Let users scroll output and select or copy a login URL. Paste inserts terminal input without adding Return.
- Recalculate rows and columns when the keyboard changes the available height. Keep the current prompt visible.
- Hide the software key row when a hardware keyboard is active.

Start with the shared terminal renderer in a mobile WebView, plus a keyboard accessory. Keep input inside the terminal surface. This is a provisional implementation route, not a verified library choice. If mobile IME behavior fails, add a native input adapter behind the same surface. Do not expose a separate command field as the default interaction.

## Required device checks before choosing the input route

Verify iOS and Android on physical devices. Check tap-to-focus, keyboard dismissal and reopening, Return, repeated Backspace, paste, and terminal selection. Include composition input and a Bluetooth keyboard with arrows and Ctrl combinations. Resize the terminal when opening the keyboard, rotating the device, and returning from the browser. Confirm that each committed character reaches the PTY once. Confirm that the terminal controls password echo.

This research does not select a native terminal library or establish Expo compatibility. The Termux wiki denied access, so Android findings use its upstream source.
