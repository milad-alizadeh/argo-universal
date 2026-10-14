import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/buttons/button';
import type { ComposerContext } from '../../state/status';
import { compactNumber, contextZone } from '../../state/status';
import { ContextZones } from './context-zones';
import { Meter } from './status-meter';
import { unselectableTextClassName } from './status-surface';
import { StatusText } from './status-text';

interface ContextContentProps {
  context: ComposerContext;
  percent: number;
  close: () => void;
}

function ContextHeading(): JSX.Element {
  return (
    <View className="px-0 gap-0.5">
      <StatusText role={'heading'} className="select-none">
        Context window
      </StatusText>
      <StatusText role="secondary" className="select-none">
        Instructions, tools, files and the conversation the Agent reads for its
        next reply.
      </StatusText>
    </View>
  );
}

function ContextZoneLabel({ percent }: { percent: number }): JSX.Element {
  const smart = contextZone(percent) === 'smart';

  return (
    <StatusText
      role="secondary"
      className={cn(
        unselectableTextClassName,
        'ml-auto',
        smart ? 'text-success' : 'text-warning',
      )}
    >
      {percent}% · {smart ? 'Smart zone' : 'Dumb zone'}
    </StatusText>
  );
}

function ContextTokenValues({
  context,
}: Pick<ContextContentProps, 'context'>): JSX.Element {
  return (
    <>
      <StatusText role="title" className="select-none">
        {compactNumber(context.used)}
      </StatusText>
      <StatusText role="body" className="select-none text-muted-foreground">
        / {compactNumber(context.size)} tokens
      </StatusText>
    </>
  );
}

function ContextTotals({
  context,
  percent,
}: Pick<ContextContentProps, 'context' | 'percent'>): JSX.Element {
  return (
    <View className="px-0 gap-2">
      <View className="flex-row items-baseline gap-1">
        <ContextTokenValues context={context} />
        <ContextZoneLabel percent={percent} />
      </View>
      <Meter percent={percent} warning />
    </View>
  );
}

const compactButtonProps = {
  variant: 'outline',
  className:
    'web:sm:min-h-0 h-7 sm:h-7 py-0 rounded-md gap-1.5 px-2.5 has-[>[data-icon]]:px-2.5',
  label: 'Compact',
  icon: 'compaction',
  custom: true,
  labelClassName: 'select-none type-control',
} as const;

type CompactContextProps = Pick<ContextContentProps, 'context' | 'close'>;

function CompactContext(props: CompactContextProps): JSX.Element {
  const { context, close } = props;

  const compact = (): void => {
    context.onCompact?.();
    close();
  };

  return (
    <View className="px-0 gap-3 flex-row items-center">
      <StatusText role="secondary" className="select-none flex-1">
        Compact before the next task.
      </StatusText>
      <Button {...compactButtonProps} onPress={compact} />
    </View>
  );
}

export function ContextContent({
  context,
  percent,
  close,
}: ContextContentProps): JSX.Element {
  return (
    <View className="p-4 gap-3.5">
      <ContextHeading />
      <ContextTotals context={context} percent={percent} />
      <ContextZones />
      {context.onCompact && <CompactContext context={context} close={close} />}
    </View>
  );
}
