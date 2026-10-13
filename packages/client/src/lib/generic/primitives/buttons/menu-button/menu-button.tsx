import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { Icon } from '../../../symbols/icon';
import { Text } from '../../display/text/text';

// A menu's trigger passes its press handlers and ref through these props.
export type MenuButtonProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'role'
> & { label: string };

// The WAI-ARIA menu button drawn inline with secondary text: a muted label and a down chevron that open a menu.
export function MenuButton({ label, ...props }: MenuButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
      className="h-5 flex-row items-center gap-1 rounded-sm px-1 web:outline-none web:hover:bg-selected web:focus-visible:bg-selected"
    >
      <MenuButtonContent label={label} />
    </Pressable>
  );
}

function MenuButtonContent({ label }: { label: string }): ReactElement {
  return (
    <>
      <Text role="secondary" className="text-muted-foreground">
        {label}
      </Text>
      <Icon
        role="secondary"
        name="chevron-down"
        className="text-muted-foreground"
      />
    </>
  );
}
