export { PlaceholderDetailView } from './components/placeholder-detail-view/placeholder-detail-view';

export { useServerPageCaption } from './hooks/use-server-caption';

export { useProjects } from './hooks/use-projects';

export { homePath } from './utils/home-path';

export {
  useRestoredThemeChoice,
  useThemeChoice,
} from './hooks/use-theme-choice';

export { type ThemeChoice, themeChoices } from './stores/theme-choice';

export {
  isShownInSlot,
  slotChoicesQuery,
  type SlotChoices,
  type SlotChoosers,
  useSlotChoices,
  useSlotChoosers,
} from './stores/slot-choices';
