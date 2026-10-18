import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon, IconSpinner } from '#primitives/content/icon';
import type { IconProps } from '#primitives/content/icon';
import type { IconRole } from '../../../symbols/icon-role';
import type { IconSymbol } from '../../../symbols/icon-symbol';

interface AdornmentProps {
  icon?: IconSymbol;
  loading?: boolean;
  textClass: string;
  role: IconRole;
  filled?: boolean;
  weight?: IconProps['weight'];
}

export function ButtonAdornment(props: AdornmentProps): ReactElement | null {
  if (!props.loading && !props.icon) return null;

  return <HiddenAdornment>{adornment(props)}</HiddenAdornment>;
}

function adornment(props: AdornmentProps): ReactElement {
  if (props.loading)
    return (
      <IconSpinner colorClassName={props.textClass} iconRole={props.role} />
    );

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
