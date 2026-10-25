import {
  historyCommits,
  type Answered,
  type FileAnswers,
} from './project-files';
import type { DrawnFiles } from './scene';

export const count = (value: number): string => value.toLocaleString('en');

const legend = `Area: lines · Colour: branching lines · Shade: changes in the last ${count(historyCommits)} commits`;

const cutShort = ({ truncated, timedOut }: Answered): boolean =>
  truncated || timedOut;

// What the map lacks when the Server cut a Query's answer short.
const missing: [measure: keyof FileAnswers, note: string][] = [
  ['lines', 'Only part of this Project’s files were read.'],
  ['branches', 'Branching lines were counted for only part of the files.'],
  [
    'touches',
    `History covers only part of the last ${count(historyCommits)} commits.`,
  ],
];

export const missingNotes = (answers: FileAnswers): string[] =>
  missing.flatMap(([measure, note]) =>
    cutShort(answers[measure]) ? [note] : [],
  );

function hiddenNote({ files, hidden }: DrawnFiles): string[] {
  if (hidden === 0) return [];

  return [
    `Showing the ${count(files.length)} largest of ${count(files.length + hidden)} files.`,
  ];
}

// What the map's area, colour and shade mean, how many files it left out, and what git's answers lacked.
export const mapNotes = (drawn: DrawnFiles, answers: FileAnswers): string[] => [
  legend,
  ...hiddenNote(drawn),
  ...missingNotes(answers),
];
