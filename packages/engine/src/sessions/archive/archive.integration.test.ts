import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import type { ResumeSessionRequest } from '@agentclientprotocol/sdk';
import { listBranches, sessionBranch } from '@repo/git';
import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession, archiveProjectPath } from '#mocks/archive';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const prompt = [{ type: 'text' as const, text: 'Keep this Session' }];

describe('Session archive through the composed Engine', () => {
  it.each(['remove', 'undo'] as const)(
    'keeps the branch and handles %s at the real five-second deadline',
    async (action) => {
      const host = await startAcpEngine({ steps: [] });
      const created = await promptedArchiveSession(host);
      writeFileSync(join(created.path, 'unsaved.txt'), 'uncommitted work');
      const started = Date.now();
      await host.caller.session.archive({ sessionId: created.sessionId });
      expect(existsSync(created.path)).toBe(true);
      expect(
        (await host.caller.session.list({ archived: true })).sessions,
      ).toMatchObject([{ sessionId: created.sessionId }]);
      await expect(
        host.caller.session.prompt({ sessionId: created.sessionId, prompt }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      await setTimeout(4500);
      expect(existsSync(created.path)).toBe(true);

      if (action === 'undo')
        await host.caller.session.unarchive({ sessionId: created.sessionId });
      await expect
        .poll(
          () =>
            host.openSessions.getSnapshot().context.sessions[created.sessionId],
          { timeout: 7000 },
        )
        .toBeUndefined();
      await setTimeout(Math.max(0, 5100 - (Date.now() - started)));
      expect(existsSync(created.path)).toBe(action === 'undo');
      const projectPath = archiveProjectPath(host);
      expect((await listBranches(projectPath)).branches).toContain(
        sessionBranch(created.sessionId),
      );
      await expect(
        host.caller.session.unarchive({ sessionId: created.sessionId }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(
        0,
      );
    },
    15000,
  );

  it('archives a closed Session without launching its Agent and finishes interrupted cleanup after Engine restart', async () => {
    const resumes: ResumeSessionRequest[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: { 'session/resume': [{ requests: resumes }] },
    });

    const created = await promptedArchiveSession(host);
    await host.caller.session.close({ sessionId: created.sessionId });
    await host.caller.session.archive({ sessionId: created.sessionId });
    expect(resumes).toEqual([]);
    expect(host.agent.processes).toHaveLength(1);
    expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);
    const projectPath = archiveProjectPath(host);
    await host.stop();
    expect(existsSync(created.path)).toBe(true);
    const restarted = await startEngineTestHost({ home: host.home });
    expect(existsSync(created.path)).toBe(false);
    expect((await listBranches(projectPath)).branches).toContain(
      sessionBranch(created.sessionId),
    );
    await expect(
      restarted.caller.session.unarchive({ sessionId: created.sessionId }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      restarted.caller.session.prompt({ sessionId: created.sessionId, prompt }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await restarted.stop();
  });
});
