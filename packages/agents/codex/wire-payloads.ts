import {
  hasFields,
  isNumber,
  isRecord,
  isString,
  optional,
} from '../src/payload-shape.ts';

export interface WireFrame {
  method?: string;
  id?: string | number;
  params?: unknown;
  result?: unknown;
  emittedAtMs?: number;
}
export type WireMessage = WireFrame & {
  method: string;
  params: Record<string, unknown>;
};
const isIdentifier = (value: unknown): value is string | number =>
  isString(value) || isNumber(value);
export const isWireFrame = (value: unknown): value is WireFrame =>
  hasFields(value, {
    method: optional(isString),
    id: optional(isIdentifier),
    emittedAtMs: optional(isNumber),
  });
export const isWireMessage = (value: unknown): value is WireMessage =>
  hasFields(value, {
    method: isString,
    params: isRecord,
    id: optional(isIdentifier),
    emittedAtMs: optional(isNumber),
  });
