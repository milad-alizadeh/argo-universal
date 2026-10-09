// The master naming convention in docs/agents/paper.md: `CodeName (phone) / State`.
const CONVENTION = /^[A-Z][A-Za-z0-9]*(?: \(phone\))?(?: \/ [^/()]+)?$/;

export function breaksConvention(name: string): boolean {
  return !CONVENTION.test(name);
}
