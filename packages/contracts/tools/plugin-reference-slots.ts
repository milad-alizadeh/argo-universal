import { partDefinition } from './plugin-reference-format';

function codeName(name: string): string {
  return `\`${name}\``;
}

function slotRow(slot: string, types: readonly string[]): string {
  return `| ${codeName(slot)} | ${types.map(codeName).join(', ')} |`;
}

export function slotTable(name: string): string {
  const slots = Object.entries(partDefinition(name).slots);

  if (!slots.length) return 'This part has no named Slots.\n';

  const rows = slots.map(([slot, types]) => slotRow(slot, types));

  return ['| Slot | Accepted parts |', '| --- | --- |', ...rows, ''].join('\n');
}
