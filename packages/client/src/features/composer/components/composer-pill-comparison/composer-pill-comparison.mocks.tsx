import type { PlanEntry } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  ComposerAgentModelControl,
  ComposerModeControl,
  type ComposerConfigurationProps,
} from '../composer-configuration/composer-configuration';
import {
  ComposerPlan,
  ComposerStatusControls,
  ComposerWorkChips,
  type ComposerStatusProps,
} from '../composer-status/composer-status';

export interface ComposerPillComparisonProps {
  configuration: ComposerConfigurationProps;
  status: ComposerStatusProps;
  entries: PlanEntry[];
  disabled?: boolean;
}

const comparisonCaption = (
  <Text role="secondary">
    Control comparison fixture; the desktop App keeps work counts in the
    Workbench.
  </Text>
);

export function ComposerPillComparison(
  props: ComposerPillComparisonProps,
): ReactElement {
  return (
    <View className="w-full gap-2">
      {comparisonCaption}
      <ComposerPlan
        entries={props.entries}
        disabled={Boolean(props.disabled)}
      />
      <ComparisonRow {...props} />
    </View>
  );
}

function ComparisonRow({
  disabled = false,
  ...props
}: ComposerPillComparisonProps): ReactElement {
  const controls = { configuration: props.configuration, disabled };
  const status = { status: props.status, disabled };

  return (
    <View className="max-w-full flex-row flex-wrap items-center gap-2">
      <ComposerWorkChips {...status} />
      <ComposerAgentModelControl {...controls} />
      <ComposerModeControl {...controls} />
      <ComposerStatusControls {...status} />
    </View>
  );
}

/* Clear themed space around the real menu trigger is the public paint audit's backdrop. */
export function CompactMenuSurface(
  props: ComposerPillComparisonProps,
): ReactElement {
  return (
    <View className="bg-card items-start p-10">
      <ComposerModeControl
        configuration={props.configuration}
        disabled={false}
      />
    </View>
  );
}
