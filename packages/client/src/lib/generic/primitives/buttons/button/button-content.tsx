import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import type { IconSize } from '../../../symbols/icon';
import { Text, TextClassContext } from '../../display/text/text';
import { ButtonAdornment } from './button-adornment';
import { contentButtonClass, contentTextClass } from './button-content-styles';
import type {
  ButtonProps,
  ButtonSize,
  ContentButtonProps,
} from './button-props';
import { buttonInteractionProps } from './button-state';

// Each size draws its icon at the same step, except `xs`, which keeps the 16 icon of a control.
const iconSizes = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const satisfies Record<ButtonSize, IconSize>;

export function ContentButton(props: ButtonProps): ReactElement {
  const textClass = contentTextClass(props);
  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable {...contentPressableProps(props)}>
        <ButtonAdornment
          {...props}
          size={props.size && iconSizes[props.size]}
          textClass={textClass}
        />
        <ButtonText {...props} />
      </Pressable>
    </TextClassContext.Provider>
  );
}

type ButtonTextProps = Pick<ButtonProps, 'label'> & {
  labelNumberOfLines?: number;
  labelClassName?: string;
};

function ButtonText(props: ButtonTextProps): ReactElement {
  return (
    <Text
      role="control"
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
    // Android fades each child on its own unless the button composites first, showing the fill through the label.
    needsOffscreenAlphaCompositing: !!props.disabled,
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
