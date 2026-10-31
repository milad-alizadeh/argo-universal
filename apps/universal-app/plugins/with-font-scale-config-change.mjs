import configPlugins from 'expo/config-plugins';

/*
 * Expo's MainActivity handles most configuration changes itself, but not `fontScale`. Without it Android destroys and
 * recreates the Activity when the person changes the system font size, and the recreated root mounts a second
 * NavigationContainer while the first is still registered for deep links (Expo Router logs "configured linking in
 * multiple places"). Handling `fontScale` keeps the one root, as a theme change (`uiMode`) already does.
 */
export function addFontScale(configChanges) {
  const handled = (configChanges ?? '').split('|').filter(Boolean);

  return [...new Set([...handled, 'fontScale'])].join('|');
}

function handleFontScale(config) {
  const activity = configPlugins.AndroidConfig.Manifest.getMainActivityOrThrow(
    config.modResults,
  );

  const attributes = activity.$;

  attributes['android:configChanges'] = addFontScale(
    attributes['android:configChanges'],
  );

  return config;
}

/*
 * An Activity that handles `fontScale` itself has to pass the new scale on, because React Native never re-reads it.
 * `src/lib/font-scale.ts` records why, and `watchFontScale` puts what this sends into `Dimensions` (#1657).
 *
 * The event's name is written out here as well as in `src/lib/font-scale.ts`. A prebuild plugin and the App it
 * builds are separate contexts, so the name is duplicated with the seam left visible (Prickles F3, A6); the test
 * beside this file imports the App's name and holds the two together.
 */
const fontScaleEvent = 'argoFontScaleChange';

const onConfigurationChangedKotlin = `  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    val host = (application as? com.facebook.react.ReactApplication)?.reactHost
    host?.currentReactContext?.emitDeviceEvent(
      "${fontScaleEvent}",
      newConfig.fontScale.toDouble()
    )
  }`;

export function passFontScaleOn(mainActivity) {
  return configPlugins.CodeGenerator.mergeContents({
    tag: 'argo-font-scale',
    src: mainActivity,
    newSrc: onConfigurationChangedKotlin,
    anchor: /^class MainActivity\s*:/m,
    offset: 1,
    comment: '//',
  }).contents;
}

function passOnFontScale(config) {
  config.modResults.contents = passFontScaleOn(config.modResults.contents);

  return config;
}

export default function withFontScaleConfigChange(config) {
  return configPlugins.withPlugins(config, [
    (withManifest) =>
      configPlugins.withAndroidManifest(withManifest, handleFontScale),
    (withActivity) =>
      configPlugins.withMainActivity(withActivity, passOnFontScale),
  ]);
}
