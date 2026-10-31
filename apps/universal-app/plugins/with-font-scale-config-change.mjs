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

export default function withFontScaleConfigChange(config) {
  return configPlugins.withAndroidManifest(config, handleFontScale);
}
