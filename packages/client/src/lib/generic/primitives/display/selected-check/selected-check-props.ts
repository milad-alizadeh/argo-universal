import type { IconRole } from '../../../symbols/icon-role';

export interface SelectedCheckProps {
  className?: string;
  role?: Extract<IconRole, 'mark' | 'body'>;
}
