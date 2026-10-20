import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/actions/button';
import type { ComposerContext } from '../../utils/status';
import { compactNumber, contextZone } from '../../utils/status';
import { ContextSheetContent } from './context-sheet-content';
import { ContextZones } from './context-zones';
import { Meter } from './status-meter';
import { phoneSheet, unselectableTextClassName } from './status-surface';
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
  label: 'Compact',
  icon: 'compaction',
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

// A phone's sheet draws grouped cards, as Settings does; its page header already reads "Context window".
export function ContextContent(props: ContextContentProps): JSX.Element {
  if (phoneSheet) return <ContextSheetContent {...props} />;

  return <ContextPopoverContent {...props} />;
}

function ContextPopoverContent({
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
