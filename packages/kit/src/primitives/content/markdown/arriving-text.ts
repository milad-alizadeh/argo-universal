/*
 * What a block that is still being written remembers of its text between renders: the text it drew
 * last, and where each run of newly arrived text begins, oldest first. A run fades in; text before
 * the first mark has settled.
 */
export interface Trail {
  text: string;
  marks: readonly number[];
}

// How long a run of arrived text takes to fade in.
export const fadeMilliseconds = 200;

/*
 * The most runs kept. A block draws at most once a frame, and at 120 frames a second this many
 * draws outlast a fade, so a run older than that has faded and joins the settled text.
 */
export const maxRuns = 32;

export const settledTrail = (text: string): Trail => ({ text, marks: [] });

// A block that starts while its message streams is new from its first letter.
export const arrivingTrail = (text: string): Trail => ({ text, marks: [0] });

/*
 * Text that grew begins a run where the old text ended. Text that changed any other way, as when
 * `**bo` becomes bold, moved what is on screen, so nothing fades: a letter already read never fades twice.
 */
function grownTrail(trail: Trail, text: string): Trail {
  if (text === trail.text) return trail;

  if (!text.startsWith(trail.text)) return settledTrail(text);

  return { text, marks: [...trail.marks, trail.text.length].slice(-maxRuns) };
}

const followed = (trail: Trail | null, text: string): Trail =>
  trail ? grownTrail(trail, text) : settledTrail(text);

// A block that stopped growing fades the last text it was given, then has nothing left to follow.
function lastTrail(trail: Trail, text: string): Trail | null {
  const last = grownTrail(trail, text);

  return last.marks.length ? last : null;
}

/*
 * The trail after a render. A growing block follows its text from the first render it grows in,
 * fading nothing it already showed. A block that has stopped growing keeps its runs until they have
 * faded, then remembers nothing: `null` costs a settled block no work.
 */
export function followText(
  trail: Trail | null,
  text: string,
  growing: boolean,
): Trail | null {
  if (growing) return followed(trail, text);

  return trail && lastTrail(trail, text);
}

// One run of a block's text, and where it starts in the block.
export interface Run {
  text: string;
  start: number;
}

// A piece of a run, drawn whole: settled text, or text that arrived together and fades in together.
export interface Piece extends Run {
  arriving: boolean;
}

const cutsWithin = ({ text, start }: Run, marks: readonly number[]): number[] =>
  marks.filter((mark) => mark > start && mark < start + text.length);

// A run cut at each mark inside it. A piece at or past the first mark arrived, and fades.
export function piecesOf(run: Run, marks: readonly number[]): Piece[] {
  const end = run.start + run.text.length;
  const edges = [run.start, ...cutsWithin(run, marks), end];
  const [first = end] = marks;

  return edges.slice(0, -1).map((start, index) => ({
    text: run.text.slice(
      start - run.start,
      (edges[index + 1] ?? end) - run.start,
    ),
    start,
    arriving: start >= first,
  }));
}
