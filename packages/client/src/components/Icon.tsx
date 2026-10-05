import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { useContext } from 'react';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';

export type IconProps = PhosphorIconProps & {
  as: PhosphorIcon;
  className?: string;
};

function IconComponent({ as: Component, ...props }: IconProps) {
  return (
    <Component
      {...props}
      style={
        typeof props.size === 'number'
          ? [props.style, { width: props.size, height: props.size }]
          : props.style
      }
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
