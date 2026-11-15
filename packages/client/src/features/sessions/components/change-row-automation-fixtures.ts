import type { ChangeRowProps } from './change-row';
import { checksPassedChangeRow } from './change-row-fixtures';

type Fixture = Omit<ChangeRowProps, 'onOpen' | 'onSetAutomation'>;

// A Change that offers one automation: the others are unavailable with no reason, so the menu draws only that one.
const withoutOthers = {
  fix: { on: false, available: false },
  archive: { on: false, available: false },
} as const;

// Auto-merge is on offer and unticked.
export const autoMergeOffChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    automation: { ...withoutOthers, merge: { on: false, available: true } },
  },
} satisfies Fixture;

// GitHub reports auto-merge turned on, here or in GitHub itself.
export const autoMergeOnChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    automation: { ...withoutOthers, merge: { on: true, available: true } },
  },
} satisfies Fixture;

// Auto-merge cannot be used, and the reason sits under it.
export const autoMergeUnavailableChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    automation: {
      ...withoutOthers,
      merge: {
        on: false,
        available: false,
        reason: "Draft pull requests can't auto-merge",
      },
    },
  },
} satisfies Fixture;

// Auto-fix turned itself off after three tries on one commit, and the reason sits under it, unticked and still usable.
export const autoFixStoppedChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    automation: {
      ...withoutOthers,
      fix: {
        on: false,
        available: true,
        reason: 'Stopped after 3 tries on a1b2c3d',
      },
      merge: { on: false, available: true },
    },
  },
} satisfies Fixture;

// Auto-archive is the only item on offer, unticked, with core's own line under it.
export const autoArchiveOffChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    automation: {
      fix: { on: false, available: false },
      merge: { on: false, available: false },
      archive: { on: false, available: true },
    },
  },
} satisfies Fixture;

// The person ticked Auto-archive, so the Plugin offers it on.
export const autoArchiveOnChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    automation: {
      ...autoArchiveOffChangeRow.change.automation,
      archive: { on: true, available: true },
    },
  },
} satisfies Fixture;
