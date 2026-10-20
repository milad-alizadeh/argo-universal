import { describe, expect, it } from 'vitest';
import {
  shellElapsed,
  shellEnding,
  shellHeading,
  shellOutcome,
  shellPassed,
  shellsSummary,
  shellSupporting,
} from './shell-format';
import {
  failedShell,
  lostShell,
  noCodeShell,
  passedShell,
  runningShell,
  sessionShells,
  shellNow,
  stoppedShell,
} from './shell-list.mocks';

describe('shellOutcome', () => {
  it.each([
    [runningShell, 'Running', undefined],
    [passedShell, 'Exit 0', 'check'],
    [failedShell, 'Exit 1', 'failed'],
    [stoppedShell, 'Stopped', 'cancelled'],
    [noCodeShell, 'Exited', undefined],
    [lostShell, 'Lost', 'warning'],
  ] as const)('labels outcome %#', (shell, label, icon) => {
    const outcome = shellOutcome(shell);

    expect([outcome.label, outcome.icon]).toEqual([label, icon]);
  });

  it('reads an exit with no code as exited', () => {
    expect(shellOutcome({ ...passedShell, exitCode: null }).label).toBe(
      'Exited',
    );
  });

  it('marks a failed exit as danger', () => {
    expect(shellOutcome(failedShell).tone).toBe('danger');
  });
});

describe('shellElapsed', () => {
  it('counts a running Shell up to now and an ended one by its run', () => {
    expect(shellElapsed(runningShell, shellNow + 1000)).toBe('4m 13s');
    expect(shellElapsed(failedShell, shellNow + 60_000)).toBe('8s');
  });
});

describe('shellSupporting', () => {
  it('shows the last line of a running Shell, else its folder', () => {
    expect(shellSupporting(runningShell)).toBe('ready on localhost:8081');
    expect(shellSupporting({ ...runningShell, lastLine: undefined })).toBe(
      runningShell.cwd,
    );
  });

  it('shows how an ended Shell ended', () => {
    expect(shellSupporting(failedShell)).toBe('Exit 1');
  });
});

describe('shellsSummary', () => {
  it('counts the running Shells and all of them', () => {
    expect(shellsSummary(sessionShells)).toBe('1 running · 3 in this Session');
    expect(shellsSummary([passedShell])).toBe('1 in this Session');
  });
});

describe('shellHeading', () => {
  it('counts a running Shell up and names how an ended one ended', () => {
    expect(shellHeading(runningShell, shellNow).label).toBe('Running · 4m 12s');
    expect(shellHeading(failedShell, shellNow).label).toBe('Exited');
    expect(shellHeading(stoppedShell, shellNow).label).toBe('Stopped');
    expect(shellHeading(lostShell, shellNow).label).toBe('Lost');
  });

  it('reads a failed exit in danger and a lost Shell as a warning', () => {
    expect(shellHeading(failedShell, shellNow).tone).toBe('danger');
    expect(shellHeading(lostShell, shellNow).tone).toBe('warning');
    expect(shellHeading(noCodeShell, shellNow).tone).toBe('muted');
  });
});

describe('shellEnding', () => {
  it('times an ended Shell but says what became of a lost one', () => {
    expect(shellEnding(stoppedShell, shellNow)).toBe('after 2m 14s');
    expect(shellEnding(lostShell, shellNow)).toBe('when the Server restarted');
  });
});

describe('shellPassed', () => {
  it('holds only for an exit of zero', () => {
    expect(
      [passedShell, failedShell, noCodeShell, lostShell].map(shellPassed),
    ).toEqual([true, false, false, false]);
  });
});
