import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import type { ComposerStatusProps } from '../../utils/status';
import { StatusPlan } from './composer-plan';
import { ContextControl } from './context-control';
import { UsageControl } from './usage-control';
import { WorkChips } from './work-chips';

export type { ComposerStatusProps } from '../../utils/status';

interface StatusControlsProps {
  status: ComposerStatusProps;
  disabled: boolean;
}

export function ComposerPlan(props: {
  entries: PlanEntry[];
  disabled: boolean;
}): JSX.Element {
  return <StatusPlan {...props} />;
}

export function ComposerStatusControls({
  status,
  disabled,
}: StatusControlsProps): JSX.Element {
  const wide = useContentWide();

  return <StatusControlsRow status={status} disabled={disabled} wide={wide} />;
}

function StatusControlsRow({
  status,
  ...controlProps
}: StatusControlsProps & { wide: boolean }): JSX.Element {
  return (
    <View className="flex-row gap-1 items-center min-w-0">
      {status.usage && <UsageControl usage={status.usage} {...controlProps} />}
      {status.context && (
        <ContextControl context={status.context} {...controlProps} />
      )}
    </View>
  );
}

export function ComposerWorkChips(props: StatusControlsProps): JSX.Element {
  return <WorkChips {...props} />;
}
