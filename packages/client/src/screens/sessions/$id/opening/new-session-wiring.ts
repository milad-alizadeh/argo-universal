import type { useSessionOptions } from '#features/new-session';
import type { SessionCallouts } from '#features/sessions';
import type { Navigate } from '#lib/product/navigation/navigation';
import type { ReadySessionNewViewProps } from '../session-new-view';
import type { NewSessionData } from './use-new-session-data';
import type { AttachmentDraft, SessionOpening } from './use-session-opening';

export interface NewSessionWiring {
  discovery?: ReturnType<typeof useSessionOptions>;
  configuration?: Pick<
    ReadySessionNewViewProps['configuration'],
    'configOptions' | 'onConfigChange' | 'opening'
  >;
  data: NewSessionData;
  connected: boolean;
  navigate: Navigate;
  attachmentDraft: AttachmentDraft;
  sessionOpening: SessionOpening;
  callout: SessionCallouts;
}

export type ReadyProps<Key extends keyof ReadySessionNewViewProps> = Pick<
  ReadySessionNewViewProps,
  Key
>;
