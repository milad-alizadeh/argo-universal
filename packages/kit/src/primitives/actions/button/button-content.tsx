import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { ButtonAdornment } from './button-adornment';
import {
  contentButtonClass,
  contentSpinnerClass,
  contentTextClass,
} from './button-content-styles';
import type { DrawnButtonProps } from './button-props';
import { buttonInteractionProps } from './button-state';

// The button Argo draws: every Button on the web, and the acting half of a web SplitButton.

export function ContentButton(props: DrawnButtonProps): ReactElement {
  const textClass = contentTextClass(props);

  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable {...contentPressableProps(props)}>
        <ButtonAdornment {...adornmentProps(props, textClass)} />
        <Text role="control">{props.label}</Text>
      </Pressable>
    </TextClassContext.Provider>
  );
}

function adornmentProps(
  props: DrawnButtonProps,
  textClass: string,
): ComponentProps<typeof ButtonAdornment> {
  return {
    ...props,
    role: 'control',
    textClass,
    spinnerClass: contentSpinnerClass(props),
  };
}

function contentPressableProps(
  props: DrawnButtonProps,
): ComponentProps<typeof Pressable> {
  return {
    ...buttonInteractionProps(props),
    onPress: props.onPress,
    accessibilityLabel: props.accessibilityLabel ?? props.label,
    testID: props.testID,
    className: contentButtonClass(props),
    // Android fades each child on its own unless the button composites first, showing the fill through the label.
    needsOffscreenAlphaCompositing: !!props.disabled,
  };
}
