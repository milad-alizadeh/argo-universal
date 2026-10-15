import type { Navigate } from '#lib/product/navigation/context';
import type { ReadySessionNewViewProps } from '../session-new-view';
import type { NewSessionData } from './use-new-session-data';
import type { AttachmentDraft, SessionOpening } from './use-session-opening';

export interface NewSessionWiring {
  configuration?: Pick<
    ReadySessionNewViewProps['configuration'],
    'configOptions' | 'onConfigChange'
  >;
  data: NewSessionData;
  connected: boolean;
  navigate: Navigate;
  attachmentDraft: AttachmentDraft;
  sessionOpening: SessionOpening;
}

export type ReadyProps<Key extends keyof ReadySessionNewViewProps> = Pick<
  ReadySessionNewViewProps,
  Key
>;
