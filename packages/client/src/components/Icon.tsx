import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';

export type IconProps = PhosphorIconProps & {
  as: PhosphorIcon;
  className?: string;
};

function IconComponent({ as: Component, ...props }: IconProps) {
  const size =
    typeof props.size === 'number'
      ? props.size
      : props.size?.endsWith('px')
        ? Number.parseFloat(props.size)
        : undefined;
  return (
    <Component
      {...props}
      style={{
        ...StyleSheet.flatten(props.style),
        ...(size === undefined ? {} : { width: size, height: size }),
      }}
    />
  );
}

const StyledIcon = withUniwind(IconComponent, {
  size: {
    fromClassName: 'className',
    styleProperty: 'width',
  },
  color: {
    fromClassName: 'className',
    styleProperty: 'color',
  },
});

export function Icon({ className, weight = 'regular', ...props }: IconProps) {
  const textClass = useContext(TextClassContext);
  return (
    <StyledIcon
      className={cn('size-5 text-foreground', textClass, className)}
      weight={weight}
      {...props}
    />
  );
}
