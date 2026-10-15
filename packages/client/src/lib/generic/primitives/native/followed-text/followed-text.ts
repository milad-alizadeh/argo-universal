import type { ObservableState } from '@expo/ui';
import { useEffect, useState } from 'react';
import { editEchoes } from './edit-echoes';

/*
 * The native field's text follows the form's value when the form changes it, such as
 * on reset. Returns the change handler for the field, which notes each edit so its
 * echo is not written back over newer typing.
 */
export function useFollowedText(
  text: ObservableState<string>,
  value: string,
  onChangeText: (value: string) => void,
): (value: string) => void {
  const [echoes] = useState(editEchoes);

  useEffect(() => {
    if (!echoes.isEcho(value) && text.get() !== value) text.set(value);
  }, [echoes, text, value]);

  return (next) => {
    echoes.edited(next);
    onChangeText(next);
  };
}
