import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import type { EngineActor } from '../src/engine/compose';
import type { HttpServer } from '../src/engine/http-server';
import { findMachineActor } from '../src/lib/machine-actor';
import {
  openSessionsId,
  openSessionsMachine,
  type OpenSessionsActorRef,
} from '../src/sessions';
import { databaseWriterId, writerMachine } from '../src/storage';

export type EngineConnections = {
  engine: EngineActor;
  database: Database;
  openSessions: OpenSessionsActorRef;
  databaseWriter: ActorRefFrom<typeof writerMachine>;
  notifications: HttpServer['notifications'];
  createCaller: HttpServer['createCaller'];
  caller: ReturnType<HttpServer['createCaller']>;
};

export function readEngineTestHost(engine: EngineActor): EngineConnections {
  const { database, server } = engine.getSnapshot().context;
  const readyServer = requireReady(server);

  return {
    engine,
    database: requireReady(database),
    openSessions: sessionActor(engine),
    databaseWriter: writerActor(engine),
    notifications: readyServer.notifications,
    createCaller: readyServer.createCaller,
    caller: readyServer.createCaller(),
  };
}

const requireReady = <T>(value: T | null | undefined): T => {
  if (!value) throw new Error('Engine is not ready');

  return value;
};

const sessionActor = (engine: EngineActor): OpenSessionsActorRef =>
  requireReady(
    findMachineActor(engine.system, openSessionsId, openSessionsMachine),
  );

const writerActor = (engine: EngineActor): ActorRefFrom<typeof writerMachine> =>
  requireReady(
    findMachineActor(engine.system, databaseWriterId, writerMachine),
  );
