/*
 * The four `format` values an Elicitation property may carry, checked by hand. Nothing here
 * builds a function from a string, so these read the same in the desktop window, where the
 * Content Security Policy forbids it, and on Hermes, which cannot do it at all.
 */
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const timePattern = /^(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:z|[+-]\d{2}:\d{2})$/i;

const emailPattern = /^[^\s@]+@[a-z\d-]+(?:\.[a-z\d-]+)*$/i;

const uriPattern = /^[a-z][a-z\d+\-.]*:\S+$/i;

const dateTimePattern = /^([^t]+)t(.+)$/i;

const lastHour = 23;

const lastMinute = 59;

// A leap second is the minute's sixty-first, counted from zero.
const leapSecond = 60;

const timeBounds = [lastHour, lastMinute, leapSecond];

const notAbove = (value: number, high: number): boolean =>
  value >= 0 && value <= high;

// A whole date the calendar has: the epoch stands in for one the runtime could not read.
function isDate(text: string): boolean {
  const instant = Date.parse(`${text}T00:00:00Z`);

  return (
    datePattern.test(text) &&
    new Date(instant || 0).toISOString().startsWith(text)
  );
}

const timeParts = (text: string): number[] =>
  (timePattern.exec(text)?.slice(1) ?? []).map(Number);

const withinBounds = (part: number, index: number): boolean =>
  notAbove(part, timeBounds[index] ?? 0);

function isTime(text: string): boolean {
  const parts = timeParts(text);

  return parts.length === timeBounds.length && parts.every(withinBounds);
}

const dateTimeTests = [isDate, isTime];

const dateTimeParts = (text: string): string[] =>
  dateTimePattern.exec(text)?.slice(1) ?? [];

const readsAsDateTime = (part: string, index: number): boolean =>
  dateTimeTests[index]?.(part) === true;

function isDateTime(text: string): boolean {
  const parts = dateTimeParts(text);

  return parts.length === dateTimeTests.length && parts.every(readsAsDateTime);
}

const formatTests = new Map([
  ['email', (text: string): boolean => emailPattern.test(text)],
  ['uri', (text: string): boolean => uriPattern.test(text)],
  ['date', isDate],
  ['date-time', isDateTime],
]);

// A format Argo does not know passes: the contract names the four it does.
export const formatValid = (format: string, text: string): boolean =>
  formatTests.get(format)?.(text) ?? true;
