import type { Plan } from '@repo/contracts';
import type { ComposerProps } from '#features/composer';
import { composerStatus } from '#features/sessions';
import type { OpenSession } from './session-composer-props';

const writtenPlan = (plan: Plan | null): ComposerProps['writtenPlan'] =>
  plan && plan.type !== 'items' ? plan : undefined;

// What the Composer shows of the Session's state: its permission request, its Plan, and its Context and Usage controls.
export function sessionStatusProps({
  permission,
  view,
  snapshot,
  usageLimits,
}: OpenSession): Pick<
  ComposerProps,
  'permissionRequest' | 'writtenPlan' | 'status'
> {
  return {
    permissionRequest: permission,
    writtenPlan: writtenPlan(view.plan),
    status: composerStatus(view.plan, snapshot.usage ?? undefined, usageLimits),
  };
}
