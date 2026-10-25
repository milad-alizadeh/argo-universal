export {
  Composer,
  type ComposerAttachment,
  type ComposerDraft,
  type ComposerProps,
} from './components/composer/composer';

export {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
} from './components/composer-configuration/composer-configuration';

export { StartSessionIn } from './components/start-session-in/start-session-in';

export { useAttachmentDraft } from './hooks/use-attachment-draft';

export type { AttachmentError } from './utils/attachment-draft';

export {
  isRememberedConfiguration,
  type SavedChoices,
} from '#lib/product/session-configuration';

export {
  configurationChoices,
  configurationEffortChoices,
} from '@repo/contracts';
