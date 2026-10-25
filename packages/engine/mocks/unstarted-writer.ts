import type { Database } from '@repo/db';
import { createActor } from 'xstate';
import { writerMachine, type WriterActorRef } from '../src/storage';

// A database writer no test has started: it accepts a Session's input and sends nothing.
export const unstartedWriter = (database: Database): WriterActorRef =>
  createActor(writerMachine, { input: { database, now: Date.now } });
