import type { KeyDownEvent } from 'react-native';
import type { ContentSelection } from './list-content-selection';

export function selectionKeys(
  _selection: ContentSelection | null,
): ((event: KeyDownEvent) => void) | undefined {
  return undefined;
}
