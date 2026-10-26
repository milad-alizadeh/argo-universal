import type { Argo } from '@argo/plugin-kit';
import { CodeMap } from './code-map';

// The Code Map lives in each Project's details, whose view runs its Queries in that Project's folder.
export function register(api: Argo): void {
  api.slots.register('argo/project/details/v1', CodeMap);
}
