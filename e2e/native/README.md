# Native Configure regression

This manual Maestro flow exercises the actual Android Storybook preview. No Server or Agent runs: the preview receives the recorded configuration props.

1. Build and install the Android development client. Start Metro.
2. Open the App's native Storybook. Select **Composer → ComposerConfiguration → Fast mode on**, then open Configure.
3. Run `maestro --device <emulator-id> test e2e/native/configure-accessibility.yaml`.

The flow requires exactly one Fast mode label and one Effort label, and checks the Toggle state on the checkable parent of its label. [Compose exposes synthetic label children for merged controls](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/compose/ui/ui/src/androidMain/kotlin/androidx/compose/ui/platform/AndroidComposeViewAccessibilityDelegateCompat.android.kt). It rejects a duplicate Fast mode label, then toggles the real Toggle off and back on. A passing run proves the Android accessibility tree and the native Toggle callback, beyond the desktop keyboard coverage in `composer-configuration-options.test.stories.tsx` and `composer-configuration.test.stories.tsx`.

The slider row still exposes its headline "Effort" and value "Medium" as nodes beside the merged "Effort, Medium"; Expo UI's `semantics` modifier takes only a content description, so no prop merges or hides them, and the flow does not assert on it. This flow does not verify TalkBack speech or slider adjustment actions. Inspect those on a device when reviewing native evidence.

# User message Show more

`user-message-show-more.yaml` runs on iOS or Android. Open the App's native Storybook at **Feed → UserMessage**, then run `maestro --device <device-id> test e2e/native/user-message-show-more.yaml`.

The "Markdown" prompt clamps to four lines. The flow taps its Show more and expects it to go, which holds only when the clipped markdown leaves Show more uncovered. Clipped lines still count as visible to Maestro, so the flow checks Show more rather than the hidden text.

# Lists, Sessions and Settings

`list-row-moves.yaml`, `grouped-row-moves.yaml`, `move-to-picker.yaml`, `session-list-rows.yaml` and `settings-list-rows.yaml` open their stories in the App's native Storybook through its `argo://storybook` link, so no Server runs. With Metro and the development client running, run `maestro --device <device-id> test e2e/native/<flow>.yaml`.

- `list-row-moves.yaml` holds a row of **Lists → List → Moves → Column** until its menu opens, checks the menu offers Move to…, and expects Move down to draw the row under the next one.
- `grouped-row-moves.yaml` holds Beta in **Lists → List → Moves → Grouped**, a native grouped List of FieldGroup rows: it expects Move down to draw Beta under Gamma, then picks the end of Second from Move to… and expects Beta under Delta.
- `move-to-picker.yaml` holds Beta, opens Move to…, and expects the sheet to draw its places: it picks the end of Second and expects Beta under Delta. A fitted List in a phone sheet once drew only the sheet's title, which fails this flow.
- Both move flows end with `subflows/move-beta-to-end-of-second.yaml`, the Move to… steps they share. Maestro runs only the top level of a folder, so the subflow never runs on its own.
- `session-list-rows.yaml` checks the Sessions list draws its Project heading and rows, and scrolls the last row into view.
- `settings-list-rows.yaml` checks the Settings list draws its root sections and scrolls to Appearance.

On iOS a Session row is one element named by its title and status, such as `Fix the failing build, Failed`, with the row's role, hint and state, since its preview's trigger hides the row's own press. Android keeps the texts apart, so only there does `session-list-rows.yaml` also check a row's activity, `Running the tests`. Every flow passes on both.

# Plugin page tap

`plugin-hello-tap.yaml` runs on iOS or Android against a real Server that loads the first-party `hello` Plugin, with the App on the phone Sessions list. Start the Server and Metro, open the development client, then run `maestro --device <device-id> test e2e/native/plugin-hello-tap.yaml`.

The flow opens the `hello` Plugin from the drawer and checks that its page is drawn natively from the wire tree. It reads the current count, which other viewers of the same Server may have raised, presses "Tap me" and expects the count to rise by one. That holds only when the event reaches the Plugin on the Server and its patch comes back.

# Slash Commands in the Attach menu

`slash-commands-attach.yaml` runs on iOS or Android. With Metro and the development client running, run `maestro --device <device-id> test e2e/native/slash-commands-attach.yaml`.

It opens **Composer → Composer → Suggestions** through the `argo://storybook` link, empties the draft, taps Attach, then Slash Commands, and expects the field to hold `/` with the inspect and review list open. That proves the native Composer hands its field to the native RichTextarea and that the Attach item reaches it. It passes on the iOS Simulator and an Android Emulator. It is not run in CI.
