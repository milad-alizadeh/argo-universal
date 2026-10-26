import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '#kit/utils';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { SelectedCheck } from '#primitives/status/selected-check';
import { Spinner } from '#primitives/status/spinner';
import { moveThroughRadios } from './field-picker-inline-keys';
import { optionChoice, type OptionRowProps } from './field-picker-kind';

/*
 * One option as a row of its own: the title (and icon or logo), the subtitle under it, and the check at the end once
 * chosen, or a spinner while the choice is being applied. The Section frames each row and draws the separators.
 * A single choice is a radio group: the chosen radio holds the tab stop and the arrow keys move through the rest.
 */
export function OptionRow(props: OptionRowProps): ReactElement {
  const { selected, toggle } = optionChoice(props);

  return (
    <Pressable {...pressProps(props, selected, toggle)}>
      <Text {...props} />
      <View className="size-4 items-center justify-center">
        <Mark selected={selected} pending={props.option.pending} />
      </View>
    </Pressable>
  );
}

function Mark(props: {
  selected: boolean;
  pending?: boolean;
}): ReactElement | null {
  if (props.pending) return <Spinner accessibilityLabel="Applying" />;

  return props.selected ? <SelectedCheck /> : null;
}

// The chosen radio, or the first when none is chosen, is the group's one tab stop.
const tabStop = (props: OptionRowProps, selected: boolean): boolean =>
  selected || (noneChosen(props) && props.option === props.options[0]);

const noneChosen = (props: OptionRowProps): boolean =>
  !props.options.some((option) => props.held.includes(option.value));

// The whole picker is disabled, or just this option.
const off = (props: OptionRowProps): boolean =>
  Boolean(props.disabled || props.option.disabled);

const pressProps = (
  props: OptionRowProps,
  selected: boolean,
  onPress: () => void,
): React.ComponentProps<typeof Pressable> => ({
  role: props.multiple ? 'checkbox' : 'radio',
  'aria-checked': selected,
  'aria-disabled': off(props),
  disabled: off(props),
  onPress,
  ...focusProps(props, selected),
  className: cn('flex-row items-center gap-3', off(props) && 'opacity-50'),
});

const focusProps = (
  props: OptionRowProps,
  selected: boolean,
): Pick<React.ComponentProps<typeof Pressable>, 'tabIndex' | 'onKeyDown'> =>
  props.multiple
    ? {}
    : {
        tabIndex: tabStop(props, selected) ? 0 : -1,
        onKeyDown: moveThroughRadios,
      };

function Text({ option }: OptionRowProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <RowTitle
        title={option.label}
        leading={option.icon}
        logo={option.logo}
        tone={option.tone}
      />
      <Subtitle text={option.subtitle} />
    </View>
  );
}

function Subtitle(props: { text?: string }): ReactElement | null {
  if (!props.text) return null;

  return (
    <NativeText role="secondary" tone="muted">
      {props.text}
    </NativeText>
  );
}
