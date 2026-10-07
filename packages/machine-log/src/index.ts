import type { ActorRefLike, InspectionEvent } from 'xstate';

export interface MachineLogOptions {
  enabled: boolean;
  processName: string;
  processId?: number;
  writeLine: (line: string) => void;
}

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export function cleanMachineContext(
  value: unknown,
  ancestors = new Set<object>(),
): JsonValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'object' || ancestors.has(value)) return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  )
    return undefined;

  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  let cleaned: JsonValue;
  if (Array.isArray(value)) {
    cleaned = Array.from({ length: value.length }, (_, index) => {
      const descriptor = descriptors[index];
      return descriptor && 'value' in descriptor
        ? (cleanMachineContext(descriptor.value, ancestors) ?? null)
        : null;
    });
  } else {
    const entries: [string, JsonValue][] = [];
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) continue;
      const cleanedValue = cleanMachineContext(descriptor.value, ancestors);
      if (cleanedValue !== undefined) entries.push([key, cleanedValue]);
    }
    cleaned = Object.fromEntries(entries);
  }
  ancestors.delete(value);
  return cleaned;
}

function actorId(actor: ActorRefLike) {
  return 'id' in actor && typeof actor.id === 'string'
    ? actor.id
    : actor.sessionId;
}

export function createMachineLog(options: MachineLogOptions) {
  if (!options.enabled) return;
  let failed = false;
  return (inspection: InspectionEvent) => {
    if (
      failed ||
      (inspection.type !== '@xstate.actor' &&
        inspection.type !== '@xstate.event' &&
        inspection.type !== '@xstate.snapshot')
    )
      return;
    try {
      const snapshot =
        inspection.type === '@xstate.snapshot'
          ? inspection.snapshot
          : undefined;
      const source =
        inspection.type === '@xstate.event' ? inspection.sourceRef : undefined;
      const line = {
        timestamp: new Date().toISOString(),
        processName: options.processName,
        processId: options.processId,
        actorId: actorId(inspection.actorRef),
        actorSessionId: inspection.actorRef.sessionId,
        rootId: inspection.rootId,
        type: inspection.type,
        eventType: 'event' in inspection ? inspection.event.type : null,
        sourceActorId: source ? actorId(source) : null,
        sourceActorSessionId: source?.sessionId ?? null,
        value: snapshot && 'value' in snapshot ? snapshot.value : null,
        status: snapshot?.status ?? null,
        context:
          snapshot && 'context' in snapshot
            ? (cleanMachineContext(snapshot.context) ?? null)
            : null,
      };
      options.writeLine(`${JSON.stringify(line)}\n`);
    } catch (error) {
      failed = true;
      console.error(
        `machine log (${options.processName}) disabled after an error:`,
        error,
      );
    }
  };
}

export function cleanInspection(inspection: InspectionEvent): InspectionEvent {
  if (inspection.type !== '@xstate.snapshot') return inspection;
  const snapshot = {
    ...inspection.snapshot,
    ...('context' in inspection.snapshot
      ? { context: cleanMachineContext(inspection.snapshot.context) ?? {} }
      : {}),
  };
  if (snapshot.status === 'done')
    snapshot.output = cleanMachineContext(snapshot.output) ?? null;
  return { ...inspection, snapshot };
}

export const inspectorOptions = {
  sanitizeEvent: (event: { type: string }) => ({ type: event.type }),
  sanitizeContext: (context: unknown) => {
    const cleaned = cleanMachineContext(context);
    return cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned)
      ? cleaned
      : {};
  },
};
