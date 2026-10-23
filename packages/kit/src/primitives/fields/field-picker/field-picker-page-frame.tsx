import {
  createElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { moveFocusAmong } from '#kit/arrow-focus';
import { wideMenuInsetClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';

type FrameProps = { search: ReactNode; footer: ReactNode; children: ReactNode };

// The web page: the arrow keys step through the rows, Enter chooses the focused one, as a menu does.
export function PageFrame(props: FrameProps): ReactElement {
  return createElement(
    'div',
    {
      role: 'group',
      onKeyDownCapture: moveFocus,
      className: cn('flex min-h-0 flex-col wide:gap-2', wideMenuInsetClassName),
    },
    props.search,
    props.children,
    props.footer,
  );
}

// The rows and the action below are buttons; a disabled one is passed over.
function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const rows = [...event.currentTarget.querySelectorAll('button')].filter(
    (row) => !row.disabled,
  );

  moveFocusAmong(event, rows);
}
