import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon, IconSpinner, type IconSize } from '../symbols/icon';
import type { IconName } from '../symbols/icon-names';
import { usePrimitiveColor } from './primitive-color';

interface AdornmentProps {
  icon?: IconName;
  loading?: boolean;
  textClass: string;
  size?: IconSize;
  filled?: boolean;
}

export function ButtonAdornment(props: AdornmentProps): ReactElement | null {
  const color = usePrimitiveColor(props.textClass);
  if (!props.loading && !props.icon) return null;
  return <HiddenAdornment>{adornment(props, color)}</HiddenAdornment>;
}

function adornment(props: AdornmentProps, color?: string): ReactElement {
  if (props.loading) return <IconSpinner color={color} size={props.size} />;
  return (
    <Icon
      name={props.icon ?? 'more'}
      size={props.size}
      filled={props.filled}
      className={props.textClass}
    />
  );
}

function HiddenAdornment({
  children,
}: {
  children: ReactElement;
}): ReactElement {
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}
