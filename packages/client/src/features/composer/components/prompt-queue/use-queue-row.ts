import type { ContentBlock, QueueCommand } from '@repo/contracts';
import { randomUUID } from 'expo-crypto';
import { useState, useEffect, useRef, type RefObject } from 'react';
import { editedPrompt, promptText } from './queue-content';
import type { QueueRowProps } from './queue-types';
import { useQueueAction } from './use-queue-action';

type QueueAction = ReturnType<typeof useQueueAction>;

type EditDraft = { text: string; editing: boolean };

type DraftSetter = (draft: EditDraft) => void;

type Hold = { token: string; open: () => void; close: () => void };

type EditCommands = {
  hold: QueueCommand;
  save: QueueCommand;
  cancel: QueueCommand;
};

interface Editing extends EditDraft {
  changeText: (text: string) => void;
  begin: () => void;
  save: () => void;
  cancel: () => void;
}

export type QueueRow = QueueAction & Editing & QueueRowProps;

export function useQueueRow(props: QueueRowProps): QueueRow {
  const action = useQueueAction(props.command);
  const editing = useEditing(props, action.run);

  return { ...props, ...action, ...editing };
}

function useEditHold({ command, row }: QueueRowProps): Hold {
  const [token] = useState(randomUUID);
  const held = useRef(false);
  useReleaseHold(command, row.id, { token, held });

  return {
    token,
    open: () => setHeld(held, true),
    close: () => setHeld(held, false),
  };
}

type HeldToken = { token: string; held: RefObject<boolean> };

function useReleaseHold(
  command: QueueRowProps['command'],
  id: string,
  { token, held }: HeldToken,
): void {
  useEffect(
    () => (): void => {
      if (held.current)
        void command({ action: 'release', id, token }).catch(() => {});
    },
    [command, id, token, held],
  );
}

function useEditing(props: QueueRowProps, run: QueueAction['run']): Editing {
  const [draft, setDraft] = useState<EditDraft>({ text: '', editing: false });
  const hold = useEditHold(props);

  return bindEditing({ props, run, draft, setDraft, hold });
}

type EditingBinding = {
  props: QueueRowProps;
  run: QueueAction['run'];
  draft: EditDraft;
  setDraft: DraftSetter;
  hold: Hold;
};

function bindEditing(input: EditingBinding): Editing {
  const { props, run, draft, setDraft, hold } = input;
  const commands = editCommands(props, hold.token, draft.text);
  const begin = (): void => openDraft(hold, setDraft, props.row.prompt);
  const close = (): void => closeDraft(hold, setDraft);

  return {
    ...draft,
    changeText: (text) => setDraft({ ...draft, text }),
    ...editHandlers(commands, run, { begin, close }),
  };
}

function editHandlers(
  commands: EditCommands,
  run: QueueAction['run'],
  callbacks: { begin: () => void; close: () => void },
): Pick<Editing, 'begin' | 'save' | 'cancel'> {
  return {
    begin: () => run(commands.hold, callbacks.begin),
    save: () => run(commands.save, callbacks.close),
    cancel: () => run(commands.cancel, callbacks.close),
  };
}

function editCommands(
  { row }: QueueRowProps,
  token: string,
  text: string,
): EditCommands {
  const target = { id: row.id, revision: row.revision, token };

  return {
    hold: { action: 'hold', ...target },
    save: { action: 'save', ...target, prompt: editedPrompt(row.prompt, text) },
    cancel: { action: 'release', id: row.id, token },
  };
}

function openDraft(
  hold: Hold,
  setDraft: DraftSetter,
  prompt: ContentBlock[],
): void {
  hold.open();
  setDraft({ editing: true, text: promptText(prompt) });
}

function closeDraft(hold: Hold, setDraft: DraftSetter): void {
  hold.close();
  setDraft({ editing: false, text: '' });
}

function setHeld(held: RefObject<boolean>, value: boolean): void {
  held.current = value;
}
