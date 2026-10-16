import type { Database } from '@repo/db';
import { createActor } from 'xstate';
import {
  createAcpResources,
  createInstalledAgents,
  type InstalledAgents,
  registryMachine,
} from '../src/agents';
import { writerMachine } from '../src/storage';

/*
 * The real Installed Agents module for an open Sessions test that never launches an Agent:
 * it answers from the test database, and its Registry actor is never started.
 * Creating that actor reads the stored Registry row once, so build it before counting reads.
 * A test that launches drives the Engine host instead.
 */
export const unlaunchedInstalledAgents = (
  database: Database,
  home: string,
): InstalledAgents =>
  createInstalledAgents({
    database,
    home,
    resources: createAcpResources(),
    registry: createActor(registryMachine, {
      input: {
        database,
        writer: createActor(writerMachine, {
          input: { database, now: Date.now },
        }),
        now: Date.now,
      },
    }),
  });
