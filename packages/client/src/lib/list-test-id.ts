import { Platform } from 'react-native';

// Legend List's web build hands its props to the scroll element as DOM attributes, where a test id is `data-testid`.
export const listTestId = (id: string) =>
  Platform.OS === 'web' ? { 'data-testid': id } : { testID: id };
