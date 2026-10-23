import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import type { MenuProps } from './menu-props';

const textTriggerClassName = cn(
  'h-5 flex-row items-center gap-1 rounded-sm px-1 web:outline-none web:hover:bg-hover web:focus-visible:bg-hover',
  tintTransitionClassName,
);

// The menu's trigger passes its press handlers and ref through these props.
type MenuTextTriggerProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'role'
> & { label: string };

// The element a menu opens from, picked for the window's size class: the caller's own, or the inline text trigger for a text label.
export function useMenuTriggerElement(
  options: MenuProps['trigger'],
): ReactElement {
  const trigger = useSizeClassValue(options);

  return typeof trigger === 'string' ? (
    <MenuTextTrigger label={trigger} />
  ) : (
    trigger
  );
}

// The WAI-ARIA menu button drawn inline with secondary text: a muted label and a down chevron that open a menu.
function MenuTextTrigger({
  label,
  ...props
}: MenuTextTriggerProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
      className={textTriggerClassName}
    >
      <MenuTextTriggerContent label={label} />
    </Pressable>
  );
}

function MenuTextTriggerContent({ label }: { label: string }): ReactElement {
  return (
    <>
      <Text role="secondary" className="text-muted-foreground">
        {label}
      </Text>
      <Icon size="xs" name="chevron-down" className="text-muted-foreground" />
    </>
  );
}
