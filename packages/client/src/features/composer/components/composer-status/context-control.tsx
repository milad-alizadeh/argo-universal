import { cn } from '@repo/kit/utils';
import type { JSX } from 'react';
import { View } from 'react-native';
import type { ComposerContext } from '../../utils/status';
import { compactNumber, contextPercent } from '../../utils/status';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ContextContent } from './context-content';
import { ContextRing } from './context-ring';
import {
  ControlLabel,
  createStatusControlTrigger,
} from './status-control-trigger';
import { phoneSheet } from './status-surface';
import { StatusText } from './status-text';

export interface ContextControlProps {
  // The Session's context window, and Compact when there is one to offer.
  context: ComposerContext;
  disabled: boolean;
  // The desktop trigger, which names the control and its token counts; a phone draws the ring alone.
  wide: boolean;
}

const triggerTokenTextProps = {
  role: 'secondary',
  className: 'select-none wide-type:text-sm',
} as const;

type ContextTokenProps = Pick<ContextControlProps, 'context' | 'wide'>;

function ContextTriggerTokens(props: ContextTokenProps): JSX.Element {
  const { context, wide } = props;

  const remainingClass = cn('select-none wide-type:text-sm', !wide && 'hidden');

  return (
    <View className={cn('flex-row', !wide && 'hidden')}>
      <StatusText {...triggerTokenTextProps}>
        {compactNumber(context.used)}
      </StatusText>
      <StatusText role="secondary" className={remainingClass}>
        {' '}
        / {compactNumber(context.size)}
      </StatusText>
    </View>
  );
}

function createContextTrigger(props: ContextControlProps): JSX.Element {
  return createStatusControlTrigger({
    ...props,
    label: 'Context',
    children: (
      <>
        <ContextRing percent={contextPercent(props.context)} />
        <ControlLabel label="Context" wide={props.wide} />
        <ContextTriggerTokens context={props.context} wide={props.wide} />
      </>
    ),
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
