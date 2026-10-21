import { Platform } from 'react-native';

// Legend List's web build hands its props to the scroll element as DOM attributes, where a test id is `data-testid`.
export const listTestIdProps = (
  testId: string,
):
  | { 'data-testid': string; testID?: never }
  | { testID: string; 'data-testid'?: never } =>
  Platform.OS === 'web' ? { 'data-testid': testId } : { testID: testId };
