import type { SessionBarEntry } from '#features/sessions';

// An open Issue's Session bar line, in its state's tone, as the Issue tracker sends it.
export const summaryLines: SessionBarEntry = {
  pluginId: 'issue-tracker',
  pluginName: 'Issue tracker',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  text: '#412 · Open',
  tone: 'success',
  path: '/issues/412',
};
