import type { SessionWorkSource } from '../../sessions';
import type { TokenCaller } from '../session-tokens';
import { watchOperationWork } from './caller-watch';
import type { WaitId, WaitIds } from './ids';
import type { WorkObservation } from './observation';
import { readOperationWork } from './reader';
import type { WorkReader } from './wait.machine';

// Reads the work behind a wait id; each read authorizes the caller again, which is how revocation reaches a waiting caller.
export class WorkReading {
  public constructor(
    private readonly source: SessionWorkSource,
    private readonly ids: WaitIds,
  ) {}
  public reader(id: WaitId, caller: () => TokenCaller): WorkReader {
    return {
      read: () => this.read(id, caller()),
      watch: (sessionId, listener) =>
        watchOperationWork(this.source.watch, caller())(sessionId, listener),
    };
  }
  public read(id: WaitId, caller: TokenCaller): WorkObservation {
    return readOperationWork(
      { source: this.source, ids: this.ids, caller },
      { id, work: this.ids.require(caller, id) },
    );
  }
}
