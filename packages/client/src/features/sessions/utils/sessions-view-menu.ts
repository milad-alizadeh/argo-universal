import type { MenuChoiceGroup } from '#primitives/overlays/menu';
import {
  type SessionsView,
  sessionsGroupChoices,
  sessionsLayoutChoices,
  sessionsStatusChoices,
} from '../stores/sessions-view';

// Each of the view's fields as one group of the menu, under its heading, in Paper's order; every option has its icon.
const viewGroups = [
  { field: 'layout', label: 'Layout', options: sessionsLayoutChoices },
  { field: 'group', label: 'Group by', options: sessionsGroupChoices },
  { field: 'status', label: 'Status', options: sessionsStatusChoices },
] as const;

type ViewGroup = (typeof viewGroups)[number];

// A group keeps its options' own types, so iOS's toolbar menu lists them as they are.
export interface SessionsViewGroup extends MenuChoiceGroup {
  options: ViewGroup['options'];
}

type ChangeView = (view: SessionsView) => void;

// A group sets only its own field; a value that is none of its options is ignored.
function viewGroup(
  { field, label, options }: ViewGroup,
  view: SessionsView,
  onViewChange: ChangeView,
): SessionsViewGroup {
  return {
    label,
    value: view[field],
    options,
    onValueChange: (value) => {
      const chosen = options.find((option) => option.value === value);

      if (chosen) onViewChange({ ...view, [field]: chosen.value });
    },
  };
}

// The view's groups, each checking its field's value, for the wide menu and the phone's native ones alike.
export const sessionsViewGroups = (
  view: SessionsView,
  onViewChange: ChangeView,
): SessionsViewGroup[] =>
  viewGroups.map((group) => viewGroup(group, view, onViewChange));
