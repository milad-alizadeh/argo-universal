import {
  Checkbox,
  CircularProgressIndicator,
  RadioButton,
} from '@expo/ui/jetpack-compose';
import { semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { useIconPixels } from '../../../symbols/icon-size';
import {
  RowListItem,
  toggling,
  type RowListItemProps,
} from '../field-row/field-row-list-item.android';
import { optionChoice, type OptionRowProps } from './field-picker-kind';

/*
 * One option as a Material ListItem, as Compose Settings draws a choice: the title, the subtitle as its supporting
 * line, and a trailing RadioButton (a Checkbox when `multiple`). The whole row toggles, with the matching role.
 */
export function OptionRow(props: OptionRowProps): ReactElement {
  const choice = optionChoice(props);
  const { option, disabled } = props;

  return (
    <RowListItem
      {...look(option)}
      disabled={disabled}
      supporting={supporting(option.subtitle)}
      trailing={<Mark {...props} selected={choice.selected} />}
      modifiers={toggles(props, choice)}
    />
  );
}

const look = (
  option: OptionRowProps['option'],
): Pick<RowListItemProps, 'title' | 'tone' | 'leading' | 'logo'> => ({
  title: option.label,
  tone: option.tone === 'danger' ? 'danger' : undefined,
  leading: option.icon,
  logo: option.logo,
});

const toggles = (
  props: OptionRowProps,
  choice: ReturnType<typeof optionChoice>,
): ReturnType<typeof toggling> =>
  toggling(
    {
      value: choice.selected,
      onValueChange: choice.toggle,
      disabled: props.disabled,
    },
    role(props),
  );

const role = (props: OptionRowProps): 'checkbox' | 'radioButton' =>
  props.multiple ? 'checkbox' : 'radioButton';

function Mark(props: OptionRowProps & { selected: boolean }): ReactElement {
  const enabled = !props.disabled;

  if (props.option.pending) return <Applying />;

  return props.multiple ? (
    <Checkbox value={props.selected} enabled={enabled} />
  ) : (
    <RadioButton selected={props.selected} enabled={enabled} />
  );
}

function supporting(subtitle: string | undefined): ReactElement | undefined {
  if (!subtitle) return undefined;

  return (
    <NativeText role="secondary" tone="muted">
      {subtitle}
    </NativeText>
  );
}

// A choice being applied shows a spinner where its radio will be.
function Applying(): ReactElement {
  const pixels = useIconPixels('md');

  return (
    <CircularProgressIndicator
      modifiers={[
        size(pixels, pixels),
        semantics({ contentDescription: 'Applying' }),
      ]}
    />
  );
}
