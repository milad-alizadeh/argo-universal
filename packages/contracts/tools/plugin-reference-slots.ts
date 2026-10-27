import { componentDefinition } from './plugin-reference-format';

function codeName(name: string): string {
  return `\`${name}\``;
}

function slotRow(slot: string, types: readonly string[]): string {
  return `| ${codeName(slot)} | ${types.length ? types.map(codeName).join(', ') : 'Text content'} |`;
}

export function slotTable(name: string): string {
  const slots = Object.entries(componentDefinition(name).slots);

  if (!slots.length) return 'This kit component has no named Slots.\n';

  const rows = slots.map(([slot, types]) => slotRow(slot, types));

  return [
    '| Slot | Accepted kit components |',
    '| --- | --- |',
    ...rows,
    '',
  ].join('\n');
}
