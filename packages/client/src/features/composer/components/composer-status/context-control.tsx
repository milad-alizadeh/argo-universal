import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { ComposerContext } from '../../utils/status';
import { compactNumber, contextPercent } from '../../utils/status';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ContextContent } from './context-content';
import { ContextRing } from './context-ring';
import {
  ControlLabel,
  createStatusControlTrigger,
} from './status-control-trigger';
import { phoneSheet, unselectableTextClassName } from './status-surface';
import { StatusText } from './status-text';

interface ContextProps {
  context: ComposerContext;
  disabled: boolean;
  wide: boolean;
}

type ContextTokenProps = Pick<ContextProps, 'context' | 'wide'>;

function ContextTriggerTokens(props: ContextTokenProps): JSX.Element {
  const { context, wide } = props;
  const remainingClass = cn(unselectableTextClassName, !wide && 'hidden');

  return (
    <View className={cn('flex-row', !wide && 'hidden')}>
      <StatusText role="secondary" className="select-none">
        {compactNumber(context.used)}
      </StatusText>
      <StatusText role="secondary" className={remainingClass}>
        {' '}
        / {compactNumber(context.size)}
      </StatusText>
    </View>
  );
}

function createContextTrigger(props: ContextProps): JSX.Element {
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

export function ContextControl(props: ContextProps): JSX.Element {
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
