import type { IconName } from '@repo/kit/symbols/icon-names';
import type { AttachLayout } from './composer-toolbar-types';

// One row of the Attach menu; without onPress it is disabled.
export interface AttachChoice {
  label: string;
  icon: IconName;
  onPress?: () => void;
}

// Chosen, it writes a `/` into the message field, which opens the field's menu; with no commands there is nothing to open.
export function slashCommandsChoice({
  props,
  field,
}: AttachLayout): AttachChoice {
  return {
    label: 'Slash Commands',
    icon: 'code',
    onPress: props.slashCommands?.length
      ? () => field.insertWord('/')
      : undefined,
  };
}
