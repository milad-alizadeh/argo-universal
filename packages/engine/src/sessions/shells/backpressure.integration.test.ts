import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { shell } from '@repo/db/schema';
import { runningShellStep } from '@repo/mocks/agent/shell-scenarios';
import { assert, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { shellOutputPath } from './files';

const producedBytes = 64 * 1024 * 1024;

const maximumPendingBytes = 4 * 1024 * 1024;

it.each(['exit', 'stop'] as const)(
  'backpressures real stdout/stderr and retains all accepted bytes through %s',
  async (ending) => {
    const host = await startAcpEngine({ steps: [] });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Keep' }],
    });

    await waitForAcpSessionIdle(host, created.sessionId);
    const marker = join(host.home, 'producer-finished');
    const gate = join(host.home, 'producer-exit');
    await requireScriptedProcessAt(host.agent.processes).play(
      [
        {
          ...runningShellStep,
          request: {
            command: process.execPath,
            args: [
              '-e',
              "const fs=require('node:fs');const b=Buffer.alloc(65536,120);for(let i=0;i<512;i++){fs.writeSync(1,b);fs.writeSync(2,b)}fs.writeFileSync(process.argv[1],'done');const timer=setInterval(()=>{if(fs.existsSync(process.argv[2])){clearInterval(timer)}},10)",
              marker,
              gate,
            ],
          },
        },
      ],
      'owned-1',
    );
    await expect
      .poll(
        () =>
          stat(marker)
            .then(() => true)
            .catch(() => false),
        { interval: 5 },
      )
      .toBe(true);

    const snapshot = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) => value.shells.length === 1,
    );

    const selected = snapshot.shells[0];

    assert(selected);
    const { id } = selected;
    const path = shellOutputPath(host.home, created.sessionId, id);
    expect(producedBytes - (await stat(path)).size).toBeLessThan(
      maximumPendingBytes,
    );

    await (ending === 'exit'
      ? writeFile(gate, 'exit')
      : host.caller.session.stopShell({ ...created, shellId: id }));
    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) =>
        value.shells[0]?.status === (ending === 'exit' ? 'exited' : 'stopped'),
    );
    const record = host.database.select().from(shell).get();
    assert(record);
    assert(record.outputBlobId);
    const output = await readFile(join(host.blobsFolder, record.outputBlobId));
    expect(output.length).toBe(producedBytes);
    expect(record.outputBlobId).toBe(
      createHash('sha256')
        .update(Buffer.alloc(producedBytes, 120))
        .digest('hex'),
    );
  },
);
