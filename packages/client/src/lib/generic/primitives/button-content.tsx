import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { ButtonAdornment } from './button-adornment';
import { contentButtonClass, contentTextClass } from './button-content-styles';
import type { ButtonProps, ContentButtonProps } from './button-props';
import { buttonInteractionProps } from './button-state';
import { Text, TextClassContext } from './text';

export function ContentButton(props: ButtonProps): ReactElement {
  const textClass = contentTextClass(props);
  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable {...contentPressableProps(props)}>
        <ButtonAdornment {...props} textClass={textClass} />
        <ButtonText {...props} />
      </Pressable>
    </TextClassContext.Provider>
  );
}

function ButtonText(
  props: Pick<ButtonProps, 'label'> & {
    labelNumberOfLines?: number;
    labelClassName?: string;
  },
): ReactElement {
  return (
    <Text
      className={props.labelClassName}
      numberOfLines={props.labelNumberOfLines}
    >
      {props.label}
    </Text>
  );
}

function contentPressableProps(
  props: ButtonProps,
): ComponentProps<typeof Pressable> {
  return {
    ...contentLayoutProps(props),
    ...buttonInteractionProps(props),
    onPress: props.onPress,
    accessibilityLabel: props.accessibilityLabel ?? props.label,
    testID: props.testID,
    className: contentButtonClass(props),
  };
}

function contentLayoutProps(
  props: Pick<ContentButtonProps, 'ref' | 'style'> & {
    appearance?: 'system' | 'content';
  },
): Pick<ComponentProps<typeof Pressable>, 'ref' | 'style'> {
  if (props.appearance !== 'content') return {};
  return { ref: props.ref, style: props.style };
}
