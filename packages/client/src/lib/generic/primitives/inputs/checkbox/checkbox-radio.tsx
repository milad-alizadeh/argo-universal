import type { ModifierConfig } from '@expo/ui/jetpack-compose/modifiers';

export interface RadioMarkProps {
  selected: boolean;
  disabled?: boolean;
  modifiers?: ModifierConfig[];
}

// iOS marks a single choice with the trailing check, so only Android draws a radio button.
export function RadioMark(_props: RadioMarkProps): null {
  return null;
}
