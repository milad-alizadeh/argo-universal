import type {
  QueueCommand,
  QueuedPrompt,
  QueueEditToken,
} from '@repo/contracts';

export type EditTarget = {
  id: QueuedPrompt['id'];
  revision: number;
  token: QueueEditToken;
};

type Command = (command: QueueCommand) => Promise<void>;

export interface EditorLifetime {
  open: () => void;
  close: () => void;
  active: () => boolean;
  claim: (target: EditTarget) => void;
  forget: (id: QueuedPrompt['id']) => void;
}

export function editorLifetime(command: Command): EditorLifetime {
  const state = { active: true };
  const claims = new Map<string, EditTarget>();

  return {
    open: () => {
      state.active = true;
    },
    active: () => state.active,
    claim: (target) => claims.set(target.id, target),
    forget: (id) => {
      claims.delete(id);
    },
    close: () => closeLifetime(state, claims, command),
  };
}

function releaseClaims(
  command: Command,
  claims: Map<string, EditTarget>,
): void {
  for (const target of claims.values()) releaseEdit(command, target);
  claims.clear();
}

export function releaseEdit(command: Command, target: EditTarget): void {
  void command({ action: 'release', id: target.id, token: target.token }).catch(
    () => {},
  );
}

function closeLifetime(
  state: { active: boolean },
  claims: Map<string, EditTarget>,
  command: Command,
): void {
  state.active = false;
  releaseClaims(command, claims);
}
