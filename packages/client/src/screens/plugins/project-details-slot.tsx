import { projectDetailsSlotId } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { PluginSlot } from '../../lib/product/plugin-registry';
import { usePluginSlot } from './use-plugin-slot';

// Project details' Slot (`argo/project/details/v1`): what Plugins add for one Project.
export function ProjectDetailsSlot({
  projectId,
}: {
  projectId: string;
}): React.JSX.Element {
  const contributions = usePluginSlot({
    slotId: projectDetailsSlotId,
    context: { projectId },
  });

  return <PluginSlot contributions={contributions} />;
}
