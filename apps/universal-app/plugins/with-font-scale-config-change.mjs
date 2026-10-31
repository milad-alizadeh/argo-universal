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
 * `DeviceInfoModule.onHostResume` is the only place that raises `didUpdateDimensions` with a new font scale on
 * Android, and the recreated Activity used to run it; `ReactHostImpl.onConfigurationChanged` lays the native text
 * out again but tells JavaScript nothing. So `Dimensions`, `useWindowDimensions().fontScale` and
 * `PixelRatio.getFontScale()` all keep the old scale, and a row that wraps once the text is enlarged
 * (`@repo/kit`'s `useEnlargedText`) and the Toolbar title that re-measures on the kit `Text`'s font-scale key both
 * stay as they were until the App is relaunched (#1657). The Activity hands JavaScript the scale instead, and
 * `watchFontScale` (src/lib/font-scale-watch) writes it into `Dimensions`.
 */
// The same name as `fontScaleEvent` in src/lib/font-scale.ts, which this plugin cannot import; its test holds the two together.
const fontScaleEvent = 'argoFontScaleChange';

const passesFontScaleOn = `
  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    val host = (application as? com.facebook.react.ReactApplication)?.reactHost
    host?.currentReactContext?.emitDeviceEvent(
      "${fontScaleEvent}",
      newConfig.fontScale.toDouble()
    )
  }
`;

export function passFontScaleOn(mainActivity) {
  if (mainActivity.includes(fontScaleEvent)) return mainActivity;

  const classEnd = mainActivity.lastIndexOf('}');

  return [
    mainActivity.slice(0, classEnd),
    passesFontScaleOn,
    mainActivity.slice(classEnd),
  ].join('');
}

function passOnFontScale(config) {
  config.modResults.contents = passFontScaleOn(config.modResults.contents);

  return config;
}

export default function withFontScaleConfigChange(config) {
  return configPlugins.withMainActivity(
    configPlugins.withAndroidManifest(config, handleFontScale),
    passOnFontScale,
  );
}
