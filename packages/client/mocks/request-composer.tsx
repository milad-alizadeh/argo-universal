import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  Composer,
  type ComposerProps,
  type ComposerDraft,
} from '../src/features/composer';
import { composerProps } from './composer-mock';

const emptyDraft: ComposerDraft = { text: '', attachments: [] };

type RequestProps = Pick<ComposerProps, 'permissionRequest'>;

export function RequestComposerPreview(props: RequestProps): ReactElement {
  return <Composer {...useRequestDraft(props)} />;
}

function useRequestDraft(props: RequestProps): ComposerProps {
  const [draft, setDraft] = useState<ComposerDraft>(emptyDraft);

  return composerProps({
    ...props,
    draft,
    onDraftChange: setDraft,
    onAttachImages: () => {},
    onSend: () => {},
    onStop: () => {},
    sessionStarted: true,
    running: true,
  });
}
