import { Platform } from 'react-native';
import {
  screenHeader,
  type HeaderDeclaration,
} from '#primitives/actions/action';
import type { ScreenHeaders } from './screen-props';

// Decided once per Screen, so no piece of it finishes the header again.
export function screenHeadersOf(declaration: HeaderDeclaration): ScreenHeaders {
  const native = Platform.OS === 'ios' ? 'ios' : 'android';

  return {
    heading: screenHeader(declaration, 'heading'),
    native: screenHeader(declaration, native),
  };
}
