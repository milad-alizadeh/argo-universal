import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useCallback, useMemo } from 'react';
import { archivedToast } from '#features/sessions';
import { archiveAsksFirst } from './archive-asks-first';
import {
  useArchiveEffects,
  type Archive,
  type ArchiveEffects,
} from './archive-session-mutations';

interface ArchiveOperations {
  one: Archive;
  many: (ids: readonly string[]) => void;
}

function archiveOne(
  effects: ArchiveEffects,
  input: Parameters<Archive>[0],
  onArchived?: () => void,
): void {
  effects.dropRow(input);
  effects.archive(input);

  if (!archiveAsksFirst) showToast(archivedToast(() => effects.undo(input)));
  onArchived?.();
}

function undoMany(effects: ArchiveEffects, ids: readonly string[]): void {
  for (const sessionId of ids) effects.undo({ sessionId });
}

function archiveMany(
  effects: ArchiveEffects,
  ids: readonly string[],
  onArchived?: () => void,
): void {
  if (ids.length === 0) return;

  sendArchives(effects, ids);
  announceArchives(effects, ids);
  onArchived?.();
}

export function useArchiveOperations(
  onArchived?: () => void,
): ArchiveOperations {
  const effects = useArchiveEffects();

  const one: Archive = useCallback(
    (input) => archiveOne(effects, input, onArchived),
    [effects, onArchived],
  );

  const many = useCallback(
    (ids: readonly string[]) => archiveMany(effects, ids, onArchived),
    [effects, onArchived],
  );

  return useMemo(() => ({ one, many }), [one, many]);
}

function sendArchives(effects: ArchiveEffects, ids: readonly string[]): void {
  for (const sessionId of ids) {
    effects.dropRow({ sessionId });
    effects.archive({ sessionId });
  }
}

function announceArchives(
  effects: ArchiveEffects,
  ids: readonly string[],
): void {
  if (!archiveAsksFirst)
    showToast({
      ...archivedToast(() => undoMany(effects, ids)),
      title: `${ids.length} Sessions archived`,
    });
}
