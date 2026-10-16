import type * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { KeyboardFocus } from './menu-choices';
import { focusTracking } from './menu-radio-item';

type ContentFocus = ReturnType<typeof focusTracking> &
  Pick<RadixMenu.DropdownMenuContentProps, 'onCloseAutoFocus'>;

// Closing hands focus back to the trigger; after a pointer, without the focus ring the browser would otherwise draw.
export function contentFocus(focus: KeyboardFocus): ContentFocus {
  return {
    ...focusTracking(focus),
    onCloseAutoFocus: (event) => {
      const trigger = menuTrigger(event.target);

      if (focus.keyboardFocus || !trigger) return;
      event.preventDefault();
      trigger.focus({ focusVisible: false });
    },
  };
}

// Radix names the menu by its trigger.
function menuTrigger(menu: EventTarget | null): HTMLElement | null {
  const id = menu instanceof Element && menu.getAttribute('aria-labelledby');

  return id ? document.getElementById(id) : null;
}
