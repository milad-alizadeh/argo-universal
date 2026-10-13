import type { ComposerLayout, ComposerProps } from './composer-types';
export type WrittenPlanLayout = Pick<ComposerLayout, 'composerId'> & {
  props: Pick<
    ComposerProps,
    'planProposal' | 'permissionRequest' | 'writtenPlan'
  >;
};
export type LivePlanLayout = Pick<ComposerLayout, 'inactive'> & {
  props: Pick<ComposerProps, 'status'>;
};
export type PlanLayout = WrittenPlanLayout & LivePlanLayout;
export type TopTrayLayout = PlanLayout & Pick<ComposerLayout, 'wide'>;
export type StatusLayout = Pick<ComposerLayout, 'inactive'> & {
  props: Pick<ComposerProps, 'status'>;
};
export type CheckoutLayout = Pick<ComposerLayout, 'inactive'> & {
  props: Pick<ComposerProps, 'configuration'>;
};
export type WideStatusLayout = StatusLayout & CheckoutLayout;
export type BottomTrayLayout = WideStatusLayout & Pick<ComposerLayout, 'wide'>;
