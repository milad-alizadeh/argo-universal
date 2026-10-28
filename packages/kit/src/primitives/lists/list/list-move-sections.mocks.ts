import type { ListMove } from '@repo/contracts/kit-moves';
import {
  rowId,
  sectionId,
  sectionKey,
  type MoveSection,
  type RowMove,
} from './list-move-model';

// A move Section as a test writes it, in plain strings.
export interface PlainSection {
  key: string;
  id?: string;
  title?: string;
  rows: readonly string[];
}

// A move Section read from plain strings, as the List reads its children's ids.
export const moveSection = ({
  key,
  id,
  title,
  rows,
}: PlainSection): MoveSection => ({
  key: sectionKey(key),
  id: id === undefined ? undefined : sectionId(id),
  title,
  rows: rows.map(rowId),
});

// A move read from the wire's plain strings.
export const rowMove = ({ id, section, index }: ListMove): RowMove => ({
  id: rowId(id),
  section: section === undefined ? undefined : sectionId(section),
  index,
});
