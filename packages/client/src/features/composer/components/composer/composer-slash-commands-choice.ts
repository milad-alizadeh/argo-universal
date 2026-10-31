import type { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { slashCommandIcon } from '../../utils/slash-command-suggestions';
import type { AttachLayout } from './composer-toolbar-types';

// One row of the Attach menu; without onPress it is disabled.
export interface AttachChoice {
  label: string;
  icon: NonNullable<React.ComponentProps<typeof FieldGroup.Link>['leading']>;
  onPress?: () => void;
}

// Chosen, it writes a `/` into the message field, which opens the field's menu; with no commands there is nothing to open.
export function slashCommandsChoice({
  props,
  field,
}: AttachLayout): AttachChoice {
  return {
    label: 'Slash Commands',
    icon: slashCommandIcon,
    onPress: props.slashCommands?.length
      ? () => field.insertWord('/')
      : undefined,
  };
}
