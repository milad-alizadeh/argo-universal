import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { storybookSyncPort } from '../../../tools/storybook-sync-port.js';
import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
  enableWebsockets: true,
  host:
    Platform.OS === 'android'
      ? (process.env.EXPO_PUBLIC_STORYBOOK_ANDROID_WS_HOST ?? '127.0.0.1')
      : '127.0.0.1',
  port: storybookSyncPort(),
});

// Default export instead of registerRootComponent: the (dev)/storybook route renders it.
export default StorybookUIRoot;
