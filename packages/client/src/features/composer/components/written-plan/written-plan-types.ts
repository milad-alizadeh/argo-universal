import type { Plan } from '@repo/contracts';
export type WrittenPlanValue = Exclude<Plan, { type: 'items' }>;
export interface WrittenPlanProps {
  plan: WrittenPlanValue;
  composerId: string;
}
