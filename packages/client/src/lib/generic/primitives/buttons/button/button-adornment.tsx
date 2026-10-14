import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon, IconSpinner } from '#primitives/display/icon';
import type { IconProps } from '#primitives/display/icon';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import type { IconName } from '../../../symbols/icon-names';
import type { IconRole } from '../../../symbols/icon-role';

interface AdornmentProps {
  icon?: IconName;
  loading?: boolean;
  textClass: string;
  role: IconRole;
  filled?: boolean;
  weight?: IconProps['weight'];
}

export function ButtonAdornment(props: AdornmentProps): ReactElement | null {
  const color = usePrimitiveColor(props.textClass);

  if (!props.loading && !props.icon) return null;

  return <HiddenAdornment>{adornment(props, color)}</HiddenAdornment>;
}

function adornment(props: AdornmentProps, color?: string): ReactElement {
  if (props.loading) return <IconSpinner color={color} iconRole={props.role} />;

  return (
    <Icon
      name={props.icon ?? 'more'}
      role={props.role}
      filled={props.filled}
      weight={props.weight}
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
