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
  type ConfigurationChange,
  isRememberedConfiguration,
  nextRememberedChange,
  rememberSessionConfiguration,
  type SavedChoices,
  savedChoicesQuery,
} from './stores/session-configuration-preferences';

export {
  configurationChoices,
  configurationEffortChoices,
} from '#lib/product/session-configuration';
