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
  typeof value === 'string' || typeof value === 'number';
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const isWireFrame = (value: unknown): value is WireFrame =>
  isObject(value) &&
  (value.method === undefined || typeof value.method === 'string') &&
  (value.id === undefined || isIdentifier(value.id)) &&
  (value.emittedAtMs === undefined || typeof value.emittedAtMs === 'number');
export const isWireMessage = (value: unknown): value is WireMessage =>
  isWireFrame(value) &&
  typeof value.method === 'string' &&
  isObject(value.params);
