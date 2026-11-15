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
  updateCommand: (command: Command) => void;
  open: () => void;
  close: () => void;
  active: () => boolean;
  claim: (target: EditTarget) => void;
  forget: (id: QueuedPrompt['id']) => void;
}

export function editorLifetime(command: Command): EditorLifetime {
  const state = { active: true, command };
  const claims = new Map<string, EditTarget>();

  return {
    updateCommand: (next) => setCommand(state, next),
    open: () => openLifetime(state),
    active: () => state.active,
    claim: (target) => claimEdit(claims, target),
    forget: (id) => {
      claims.delete(id);
    },
    close: () => closeLifetime(state, claims, state.command),
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

function claimEdit(claims: Map<string, EditTarget>, target: EditTarget): void {
  if (claims.size > 0) throw new Error('Finish the current queue edit first');
  claims.set(target.id, target);
}

export async function holdEdit(
  command: Command,
  lifetime: EditorLifetime,
  target: EditTarget,
): Promise<void> {
  try {
    await command({ action: 'hold', ...target });
  } catch (error) {
    lifetime.forget(target.id);
    releaseEdit(command, target);
    throw error;
  }
}

function setCommand(state: { command: Command }, command: Command): void {
  state.command = command;
}

function openLifetime(state: { active: boolean }): void {
  state.active = true;
}
