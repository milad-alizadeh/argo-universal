import * as WebPopover from '@radix-ui/react-popover';
import type {
  FocusEvent,
  PointerEvent,
  ReactElement,
  ReactNode,
  HTMLAttributes,
} from 'react';
import { Text } from '#primitives/content/text';
import { Popover, PopoverContent } from '#primitives/overlays/popover';
import type { LinkPreviewProps } from './link-preview-props';
import { useLinkPreview, type PreviewState } from './use-link-preview';

const preventFocus = (event: Event): void => event.preventDefault();

export function LinkPreview(props: LinkPreviewProps): ReactElement {
  return <Preview key={props.href} {...props} />;
}

function Preview({ href, children }: LinkPreviewProps): ReactElement {
  const state = useLinkPreview(href);

  return (
    <Popover open={state.open} onOpenChange={state.setOpen} inline>
      <PreviewAnchor state={state}>{children}</PreviewAnchor>
      <PreviewContent href={href} state={state} />
    </Popover>
  );
}

function PreviewAnchor({
  state,
  children,
}: {
  state: PreviewState;
  children: ReactNode;
}): ReactElement {
  return (
    <WebPopover.Anchor asChild>
      <span {...anchorHandlers(state)}>{children}</span>
    </WebPopover.Anchor>
  );
}

function pointerEnter(enter: () => void): (event: PointerEvent) => void {
  return (event): void => {
    if (event.pointerType !== 'touch') enter();
  };
}

function keyboardFocus(enter: () => void): (event: FocusEvent) => void {
  return (event): void => {
    if (event.target.matches(':focus-visible')) enter();
  };
}

function PreviewContent({
  href,
  state,
}: {
  href: string;
  state: PreviewState;
}): ReactElement {
  return (
    <PopoverContent {...contentProps(href, state)}>
      <div onPointerEnter={state.clear} onPointerLeave={state.leave}>
        {state.data || <UrlTooltip href={href} />}
      </div>
    </PopoverContent>
  );
}

function contentClassName(data: ReactNode): string {
  return data
    ? 'w-80 max-w-full overflow-hidden p-0'
    : 'w-auto max-w-64 rounded-sm border-0 bg-primary px-2 py-1 shadow-control';
}

function UrlTooltip({ href }: { href: string }): ReactElement {
  return (
    <div role="tooltip">
      <Text
        role="secondary"
        className="text-primary-foreground whitespace-normal"
      >
        {href}
      </Text>
    </div>
  );
}

function anchorHandlers(state: PreviewState): HTMLAttributes<HTMLSpanElement> {
  return {
    onPointerEnter: pointerEnter(state.enter),
    onPointerLeave: state.leave,
    onFocus: keyboardFocus(state.enter),
    onBlur: state.leave,
    onClickCapture: state.close,
  };
}

function contentProps(
  href: string,
  state: PreviewState,
): React.ComponentProps<typeof PopoverContent> {
  return {
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    accessibilityLabel: state.data ? 'Link preview' : href,
    onOpenAutoFocus: preventFocus,
    onCloseAutoFocus: preventFocus,
    className: contentClassName(state.data),
  };
}
