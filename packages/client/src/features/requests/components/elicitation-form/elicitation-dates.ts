// A `date-time` answer is an instant (ISO with its zone); the picker holds a local `YYYY-MM-DDTHH:mm`.
const pad = (part: number): string => String(part).padStart(2, '0');

export function localDateTime(instant: string | undefined): string | undefined {
  const date = new Date(instant ?? '');

  if (Number.isNaN(date.getTime())) return undefined;

  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// An empty or invalid local time is an empty answer, so the field clears and a required one can say so.
export function instantOf(local: string): string {
  const date = new Date(local);

  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
