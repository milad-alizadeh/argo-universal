import type { Navigate } from '#lib/product/navigation/navigation';
import type { ReadySessionNewViewProps } from '../session-new-view';
import type { NewSessionCallout } from './use-new-session-callout';
import type { NewSessionData } from './use-new-session-data';
import type { AttachmentDraft, SessionOpening } from './use-session-opening';

export interface NewSessionWiring {
  configuration?: Pick<
    ReadySessionNewViewProps['configuration'],
    'configOptions' | 'onConfigChange' | 'opening'
  >;
  data: NewSessionData;
  connected: boolean;
  navigate: Navigate;
  attachmentDraft: AttachmentDraft;
  sessionOpening: SessionOpening;
  callout: NewSessionCallout;
}

export type ReadyProps<Key extends keyof ReadySessionNewViewProps> = Pick<
  ReadySessionNewViewProps,
  Key
>;
