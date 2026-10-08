import methods from './notification-methods.gen.json' with { type: 'json' };

export function isIgnoredMethod(method: string): boolean {
  return methods.known.includes(method) && !methods.handled.includes(method);
}
