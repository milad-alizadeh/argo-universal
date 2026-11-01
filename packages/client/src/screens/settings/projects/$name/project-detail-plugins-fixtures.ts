import type { ProjectInfo } from '@repo/contracts';
import type { ProjectDetailsItem } from '@repo/contracts/plugins/wire';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { worktreeProject } from '../../../../features/settings/components/settings-pages.mocks';
import type { ReadItem } from '../../../plugins/slot-items';

const read = (
  pluginId: string,
  pluginName: string,
  item: ProjectDetailsItem,
): ReadItem<ProjectDetailsItem> => ({
  pluginId,
  pluginName,
  pluginIcon: iconSymbols.plug,
  item,
});

/*
 * What two Plugins answer for this Project (ADR-0046), in the Server's order: the first sends two rows, which the
 * section separates as it does Argo's own, and the second one row naming the Tracker it opens a page to change.
 */
export const pluginItems: ReadItem<ProjectDetailsItem>[] = [
  read('example', 'Example', {
    title: 'Pull requests',
    value: '3 open',
    action: { path: '/pull-requests' },
  }),
  read('example', 'Example', { title: 'Last sync', value: '2 minutes ago' }),
  read('issue-tracker', 'Issue tracker', {
    title: 'Issue tracker',
    value: 'GitHub Issues',
    icon: { sf: 'smallcircle.circle', material: 'adjust' },
    action: { path: '/tracker' },
  }),
];

// A Project whose folder path is as long as a deep checkout's.
export const longPathProject: ProjectInfo = {
  ...worktreeProject,
  path: '/Users/milad/Developer/clients/acme-corporation/platform/services/billing-and-invoicing/checkout-worktree',
};
