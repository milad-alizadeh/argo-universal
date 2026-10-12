# Native Configure regression

This manual-run Maestro flow exercises the actual Android Storybook preview. It needs a rebuilt development client because the Expo UI patch adds `clearSemantics`. No Server or Agent runs: the preview receives the recorded configuration props.

1. Build and install the Android development client. Start Metro.
2. Open the App's native Storybook. Select **Composer → ComposerConfiguration → Fast mode on**, then open Configure.
3. Run `maestro --device <emulator-id> test e2e/native/configure-accessibility.yaml`.

The flow requires exactly one named Fast mode control and one named Effort control. It rejects the duplicate decorative labels and values, then toggles the real Switch off and back on. The initial Medium value comes from the story's fixture. A passing run proves the Android accessibility tree and the native Switch callback, beyond the desktop keyboard coverage in `composer-options.test.stories.tsx` and `composer-configuration.test.stories.tsx`.

This flow does not verify TalkBack speech or slider adjustment actions. Inspect those on a device when reviewing native evidence.
