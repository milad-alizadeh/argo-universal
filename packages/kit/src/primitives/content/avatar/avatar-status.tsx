import { avatarDefaults } from '@repo/contracts/kit-tokens';
import { useContext } from 'react';
import { View } from 'react-native';
import { StatusDot } from '#primitives/status/status-dot';
import { StatusMarkHidden } from '../../../status-mark-context';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { cn } from '../../../utils';
import type { AvatarProps } from './avatar-props';

type StatusProps = Pick<
  AvatarProps,
  'size' | 'status' | 'statusSurface' | 'testID'
>;

const diameters = { xs: 24, sm: 24, md: 32, lg: 40, xl: 56 };

const dotDiameters = { xs: 6, sm: 6, md: 6, lg: 8, xl: 10 };

const dotClasses = {
  xs: 'size-1.5',
  sm: 'size-1.5',
  md: 'size-1.5',
  lg: 'size-2',
  xl: 'size-2.5',
};

const desktopExtraSmall = 20;

const ringWidth = 2;

interface StatusPosition {
  top: number;
  right: number;
}

export function AvatarStatus(props: StatusProps): React.JSX.Element | null {
  const hidden = useContext(StatusMarkHidden);
  const position = useStatusPosition(props.size);

  if (!props.status || hidden) return null;

  return (
    <View className={statusClass(props.statusSurface)} style={position}>
      <StatusDot
        tone={props.status.tone}
        pulse={props.status.pulse}
        className={dotClass(props.size)}
        testID={statusTestID(props.testID)}
      />
    </View>
  );
}

function useStatusPosition(size: AvatarProps['size']): StatusPosition {
  const wide = useSizeClass() === 'wide';
  const diameter = avatarDiameter(size, wide);
  const slot = dotDiameters[size ?? avatarDefaults.size] + ringWidth * 2;
  const inset = (diameter * (1 - Math.SQRT1_2) - slot) / 2;

  return { top: inset, right: inset };
}

function avatarDiameter(size: AvatarProps['size'], wide: boolean): number {
  if (size === 'xs' && wide) return desktopExtraSmall;

  return defaultDiameter(size);
}

function statusTestID(testID?: string): string | undefined {
  return testID ? `${testID}-status` : undefined;
}

function statusClass(surface: AvatarProps['statusSurface']): string {
  return cn(
    'absolute rounded-full border-2',
    surface === 'muted' ? 'border-muted bg-muted' : 'border-card bg-card',
    surface === 'selected' && 'web:wide:border-content web:wide:bg-content',
  );
}

function defaultDiameter(size: AvatarProps['size']): number {
  return diameters[size ?? avatarDefaults.size];
}

function dotClass(size: AvatarProps['size']): string {
  return dotClasses[size ?? avatarDefaults.size];
}
