import { Icon } from '@repo/kit/primitives/content/icon';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type { JSX } from 'react';
import type { ComposerContext } from '../../utils/status';
import { compactNumber, contextZone } from '../../utils/status';
import { contextZones } from './context-zones';
import { Meter } from './status-meter';
import { StatusSheetList } from './status-surface';

export interface ContextSheetContentProps {
  context: ComposerContext;
  percent: number;
  close: () => void;
}

export const contextDescription =
  'Instructions, tools, files and the conversation the Agent reads for its next reply.';

/*
 * A phone's Context window sheet, in grouped cards as Settings' rows: the tokens used with their meter, the two
 * zones, and Compact. The sheet's page header already reads "Context window".
 */
export function ContextSheetContent(
  props: ContextSheetContentProps,
): JSX.Element {
  return (
    <StatusSheetList>
      <ListSection>
        <TokensRow {...props} />
      </ListSection>
      <ZonesSection />
      {props.context.onCompact ? <CompactSection {...props} /> : null}
    </StatusSheetList>
  );
}

function ZonesSection(): JSX.Element {
  return (
    <ListSection title="Zones">
      {contextZones.map((zone) => (
        <ListItem
          key={zone.label}
          title={zone.label}
          subtitle={zone.explanation}
          leading={<StatusDot tone={zone.tone} />}
          multiline
        />
      ))}
    </ListSection>
  );
}

function TokensRow({
  context,
  percent,
}: Pick<ContextSheetContentProps, 'context' | 'percent'>): JSX.Element {
  const zone = contextZone(percent) === 'smart' ? 'Smart zone' : 'Dumb zone';

  return (
    <ListItem
      title={`${compactNumber(context.used)} / ${compactNumber(context.size)} tokens`}
      value={`${percent}% · ${zone}`}
      description={contextDescription}
      control={<Meter percent={percent} warning />}
    />
  );
}

// Row descriptions, as Settings' rows: iOS closes the card with them, Android draws them under the title.
const compactItemProps = {
  title: 'Compact',
  description: 'Compact before the next task.',
  leading: <Icon size="md" name="compaction" />,
};

function CompactSection({
  context,
  close,
}: ContextSheetContentProps): JSX.Element {
  const compact = (): void => {
    context.onCompact?.();
    close();
  };

  return (
    <ListSection>
      <ListItem {...compactItemProps} onPress={compact} />
    </ListSection>
  );
}
