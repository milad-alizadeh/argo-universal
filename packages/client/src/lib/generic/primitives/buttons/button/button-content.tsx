import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { Text, TextClassContext } from '../../display/text/text';
import { ButtonAdornment } from './button-adornment';
import { contentButtonClass, contentTextClass } from './button-content-styles';
import type { ButtonProps, ContentButtonProps } from './button-props';
import { buttonInteractionProps } from './button-state';

export function ContentButton(props: ButtonProps): ReactElement {
  const textClass = contentTextClass(props);
  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable {...contentPressableProps(props)}>
        <ContentAdornment button={props} side="leading" />
        <ButtonAdornment {...props} role="control" textClass={textClass} />
        <ButtonText {...props} />
        <ContentAdornment button={props} side="trailing" />
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
    ...contentTriggerProps(props),
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

function ContentAdornment({
  button,
  side,
}: {
  button: ButtonProps;
  side: 'leading' | 'trailing';
}): ReactElement | undefined {
  return button.appearance === 'content' ? button[side] : undefined;
}

type ContentPopupProps = Pick<
  ContentButtonProps,
  'aria-haspopup' | 'aria-expanded' | 'aria-controls'
>;

function contentPopupProps(props: ContentButtonProps): ContentPopupProps {
  return {
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
  };
}

function contentTriggerProps(
  props: ButtonProps,
): Pick<ContentButtonProps, 'id' | 'onHoverIn' | 'onHoverOut'> &
  ContentPopupProps {
  if (props.appearance !== 'content') return {};
  return {
    id: props.id,
    onHoverIn: props.onHoverIn,
    onHoverOut: props.onHoverOut,
    ...contentPopupProps(props),
  };
}
