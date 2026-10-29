import type { JSX } from 'react';
import type { ComposerContext } from '../../utils/status';
import { compactNumber, contextPercent } from '../../utils/status';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ContextContent } from './context-content';
import { ContextRing } from './context-ring';
import { createStatusControlTrigger } from './status-control-trigger';
import { phoneSheet } from './status-surface';

export interface ContextControlProps {
  // The Session's context window, and Compact when there is one to offer.
  context: ComposerContext;
  disabled: boolean;
  // The desktop trigger, which names the control and its token counts; a phone draws the ring alone.
  wide: boolean;
}

function createContextTrigger(props: ContextControlProps): JSX.Element {
  return createStatusControlTrigger({
    ...props,
    label: 'Context',
    leading: <ContextRing percent={contextPercent(props.context)} />,
    detail: props.wide
      ? `${compactNumber(props.context.used)} / ${compactNumber(props.context.size)}`
      : undefined,
  });
}

const contextPopoverProps = {
  label: 'Context window',
  width: 320,
  listContent: phoneSheet,
};

export function ContextControl(props: ContextControlProps): JSX.Element {
  const contentProps = {
    context: props.context,
    percent: contextPercent(props.context),
  };

  return (
    <ComposerPopover
      {...contextPopoverProps}
      trigger={createContextTrigger(props)}
    >
      {(close) => <ContextContent {...contentProps} close={close} />}
    </ComposerPopover>
  );
}
