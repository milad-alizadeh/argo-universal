import type * as React from 'react';
import type { ReactNode, Ref } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { Icon } from '../../../symbols/icon';
import { IconButton } from '../../buttons/icon-button/icon-button';
import {
  type SearchFieldGeometry,
  useCloseStyle,
  useLensStyle,
  useRestStyle,
  useSurfaceStyle,
  useTextStyle,
} from './search-field-motion';

interface MorphState {
  open: boolean;
  progress: SharedValue<number>;
  geometry: SearchFieldGeometry;
}

// The title and other actions, which leave the accessibility tree while the field covers them.
export function RestRow(
  props: MorphState & { title: ReactNode; actions?: ReactNode },
): React.JSX.Element {
  return (
    <Animated.View
      aria-hidden={props.open}
      accessibilityElementsHidden={props.open}
      inert={props.open}
      className="min-w-0 flex-1 flex-row items-center gap-1"
      style={useRestStyle(props.progress)}
    >
      <View className="min-w-0 flex-1">{props.title}</View>
      {props.actions}
    </Animated.View>
  );
}

// Drawn above the surface, so the button's lens becomes the field's.
export function Lens(props: MorphState): React.JSX.Element {
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-y-0 right-0 items-center justify-center"
      style={[
        { width: props.geometry.triggerWidth },
        useLensStyle(props.progress, props.geometry),
      ]}
    >
      <Icon name="search" size="md" className="text-muted-foreground" />
    </Animated.View>
  );
}

// The surface, the query and Close, hidden and inert until the field opens.
export function OpenField(
  props: MorphState & { onClose: () => void; children: ReactNode },
): React.JSX.Element {
  return (
    <View
      pointerEvents={props.open ? 'box-none' : 'none'}
      aria-hidden={!props.open}
      accessibilityElementsHidden={!props.open}
      importantForAccessibility={props.open ? 'auto' : 'no-hide-descendants'}
      inert={!props.open}
      className="absolute inset-0"
    >
      <Animated.View
        className="absolute inset-y-0 right-0 rounded-2xl bg-muted"
        style={useSurfaceStyle(props.progress, props.geometry)}
      />
      <Animated.View
        className="absolute inset-0"
        style={useTextStyle(props.progress)}
      >
        {props.children}
      </Animated.View>
      <CloseButton progress={props.progress} onClose={props.onClose} />
    </View>
  );
}

function CloseButton(props: {
  progress: SharedValue<number>;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Animated.View
      className="absolute right-1 top-1"
      style={useCloseStyle(props.progress)}
    >
      <IconButton
        icon="close"
        variant="ghost"
        accessibilityLabel="Close search"
        iconClassName="text-muted-foreground"
        onPress={props.onClose}
        className="size-8 min-h-8 min-w-8 sm:size-8 android:min-h-8 android:min-w-8"
      />
    </Animated.View>
  );
}

interface QueryInputProps {
  ref: Ref<TextInput>;
  editable: boolean;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onEscape: () => void;
}

// A bare input on the muted surface: search must not look like a form field.
export function QueryInput({
  ref,
  ...props
}: QueryInputProps): React.JSX.Element {
  return (
    <TextInput
      ref={ref}
      editable={props.editable}
      accessibilityLabel={props.label}
      placeholder={props.label}
      placeholderTextColorClassName="accent-muted-foreground"
      value={props.value}
      onChangeText={props.onChangeText}
      onKeyPress={({ nativeEvent }) => {
        if (nativeEvent.key === 'Escape') props.onEscape();
      }}
      autoCapitalize="none"
      autoCorrect={false}
      className="type-body ios:leading-none h-full web:h-10 w-full py-0 pl-9 pr-11 text-foreground web:outline-none"
      style={{ textAlignVertical: 'center' }}
    />
  );
}
