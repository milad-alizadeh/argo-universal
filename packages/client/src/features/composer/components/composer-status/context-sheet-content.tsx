import type { JSX } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { StatusDot } from '#primitives/status/status-dot';
import type { ComposerContext } from '../../utils/status';
import { compactNumber, contextZone } from '../../utils/status';
import { contextZones } from './context-zones';
import { Meter } from './status-meter';

interface ContextSheetContentProps {
  context: ComposerContext;
  percent: number;
  close: () => void;
}

const description =
  'Instructions, tools, files and the conversation the Agent reads for its next reply.';

/*
 * A phone's Context window sheet, in grouped cards as Settings' rows: the tokens used with their meter, the two
 * zones, and Compact. The sheet's page header already reads "Context window".
 */
export function ContextSheetContent(
  props: ContextSheetContentProps,
): JSX.Element {
  return (
    <View className="flex-1">
      <List appearance="grouped" fit>
        <ListSection footer={description}>
          <TokensRow {...props} />
        </ListSection>
        <ZonesSection />
        {props.context.onCompact ? <CompactSection {...props} /> : null}
      </List>
    </View>
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
      control={<Meter percent={percent} warning />}
    />
  );
}

const compactItemProps = {
  title: 'Compact',
  leading: <Icon role="row" name="compaction" />,
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
    <ListSection footer="Compact before the next task.">
      <ListItem {...compactItemProps} onPress={compact} />
    </ListSection>
  );
}
