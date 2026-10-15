# Native Configure regression

This manual Maestro flow exercises the actual Android Storybook preview. It needs a rebuilt development client because the Expo UI patch adds `clearSemantics`. No Server or Agent runs: the preview receives the recorded configuration props.

1. Build and install the Android development client. Start Metro.
2. Open the App's native Storybook. Select **Composer → ComposerConfiguration → Fast mode on**, then open Configure.
3. Run `maestro --device <emulator-id> test e2e/native/configure-accessibility.yaml`.

The flow requires exactly one Fast mode label and one Effort label, and checks the Switch state on the checkable parent of its label. [Compose exposes synthetic label children for merged controls](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/compose/ui/ui/src/androidMain/kotlin/androidx/compose/ui/platform/AndroidComposeViewAccessibilityDelegateCompat.android.kt). It rejects the duplicate decorative labels and values, then toggles the real Switch off and back on. The initial Medium value comes from the story's fixture. A passing run proves the Android accessibility tree and the native Switch callback, beyond the desktop keyboard coverage in `composer-options.test.stories.tsx` and `composer-configuration.test.stories.tsx`.

This flow does not verify TalkBack speech or slider adjustment actions. Inspect those on a device when reviewing native evidence.

# User message Show more

`user-message-show-more.yaml` runs on iOS or Android. Open the App's native Storybook at **Feed → UserMessage**, then run `maestro --device <device-id> test e2e/native/user-message-show-more.yaml`.

The "Markdown" prompt clamps to four lines. The flow taps its Show more and expects it to go, which holds only when the clipped markdown leaves Show more uncovered. Clipped lines still count as visible to Maestro, so the flow checks Show more rather than the hidden text.
