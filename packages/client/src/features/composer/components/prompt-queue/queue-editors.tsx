import { QueueEditToken } from '@repo/contracts';
import type { QueuedPrompt } from '@repo/contracts';
import { randomUUID } from 'expo-crypto';
import {
  createContext,
  use,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { promptText, editedPrompt } from './queue-content';
import {
  editorLifetime,
  releaseEdit,
  type EditTarget,
  type EditorLifetime,
} from './queue-editor-lifetime';
import type { PromptQueueProps } from './queue-types';

type Draft = EditTarget & { text: string };

interface Drafts {
  [id: QueuedPrompt['id']]: Draft;
}

type SetDrafts = (change: (drafts: Drafts) => Drafts) => void;

export interface QueueEditors {
  drafts: Drafts;
  begin: (row: QueuedPrompt) => Promise<void>;
  save: (row: QueuedPrompt) => Promise<void>;
  cancel: (row: QueuedPrompt) => Promise<void>;
  change: (id: QueuedPrompt['id'], text: string) => void;
}

const Editors = createContext<QueueEditors | null>(null);

type EditorOwner = Pick<PromptQueueProps, 'command'> & { children: ReactNode };

export function QueueEditorsProvider({
  command,
  children,
}: EditorOwner): ReactElement {
  const [drafts, setDrafts] = useState<Drafts>({});
  const [lifetime] = useState(() => editorLifetime(command));
  useEditorLifetime(lifetime);
  const binding = { command, drafts, setDrafts, lifetime };

  return (
    <Editors.Provider value={{ drafts, ...editorActions(binding) }}>
      {children}
    </Editors.Provider>
  );
}

export function useQueueEditors(): QueueEditors {
  const editors = use(Editors);

  if (!editors) throw new Error('Queue rows need their editor owner');

  return editors;
}

function useEditorLifetime(lifetime: EditorLifetime): void {
  useEffect(() => {
    lifetime.open();

    return (): void => lifetime.close();
  }, [lifetime]);
}

type Binding = Pick<PromptQueueProps, 'command'> & {
  drafts: Drafts;
  setDrafts: SetDrafts;
  lifetime: EditorLifetime;
};

function editorActions(binding: Binding): Omit<QueueEditors, 'drafts'> {
  return {
    begin: (row) => beginEdit(binding, row),
    save: (row) => saveEdit(binding, row),
    cancel: (row) => cancelEdit(binding, row),
    change: (id, text) =>
      binding.setDrafts((drafts) => changeText(drafts, id, text)),
  };
}

async function beginEdit(binding: Binding, row: QueuedPrompt): Promise<void> {
  const target = {
    id: row.id,
    revision: row.revision,
    token: QueueEditToken.parse(randomUUID()),
  };

  binding.lifetime.claim(target);
  await binding.command({ action: 'hold', ...target });

  if (!binding.lifetime.active()) return releaseEdit(binding.command, target);
  binding.setDrafts((drafts) => ({
    ...drafts,
    [row.id]: { ...target, text: promptText(row.prompt) },
  }));
}

async function saveEdit(binding: Binding, row: QueuedPrompt): Promise<void> {
  const draft = requireDraft(binding, row.id);
  await binding.command({
    action: 'save',
    id: draft.id,
    revision: draft.revision,
    token: draft.token,
    prompt: editedPrompt(row.prompt, draft.text),
  });
  finishEdit(binding, row.id);
}

async function cancelEdit(binding: Binding, row: QueuedPrompt): Promise<void> {
  const draft = requireDraft(binding, row.id);
  await binding.command({
    action: 'release',
    id: draft.id,
    token: draft.token,
  });
  finishEdit(binding, row.id);
}

function requireDraft(
  binding: Pick<Binding, 'drafts'>,
  id: QueuedPrompt['id'],
): Draft {
  const draft = binding.drafts[id];

  if (!draft) throw new Error('The queue edit ended');

  return draft;
}

function finishEdit(
  binding: Pick<Binding, 'setDrafts' | 'lifetime'>,
  id: QueuedPrompt['id'],
): void {
  binding.lifetime.forget(id);
  binding.setDrafts((drafts) => withoutDraft(drafts, id));
}

function withoutDraft(drafts: Drafts, id: QueuedPrompt['id']): Drafts {
  const next = { ...drafts };
  delete next[id];

  return next;
}

function changeText(
  drafts: Drafts,
  id: QueuedPrompt['id'],
  text: string,
): Drafts {
  const draft = drafts[id];

  return draft ? { ...drafts, [id]: { ...draft, text } } : drafts;
}
