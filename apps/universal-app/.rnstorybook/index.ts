import AsyncStorage from '@react-native-async-storage/async-storage';
import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  initialSelection: 'design-system-primitives-picker--variations',
  shouldPersistSelection: false,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

// Default export instead of registerRootComponent: the (dev)/storybook route renders it.
export default StorybookUIRoot;
