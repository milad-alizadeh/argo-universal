import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { useMoveActions } from './list-move-actions';
import type { RowId } from './list-move-model';
import { ListMovePicker } from './list-move-picker-drawing';
import { isNativeRow } from './list-native-row-mark';

interface FieldRowMovesProps {
  // The row's move id; a row the List cannot move has none.
  id: RowId | undefined;
  content: ReactNode;
}

function MovableFieldRow({
  id,
  content,
}: FieldRowMovesProps & { id: RowId }): ReactElement {
  const moves = useMoveActions(id);

  return (
    <ContextActions builtIn={moves}>
      <View className="relative">
        {content}
        <ListMovePicker id={id} />
      </View>
    </ContextActions>
  );
}

const isFieldRow = (content: ReactNode): boolean =>
  isValidElement(content) && isNativeRow(content);

/*
 * A FieldGroup row that moves in a List drawn on LegendList, as the web draws a grouped List: its context menu offers
 * the Move Section a ListItem's does, and its Move to… picker opens over it, so every move a drag makes can be made
 * from the keyboard too. A ListItem draws its own; any other row draws as it is.
 */
export function FieldRowMoves({ id, content }: FieldRowMovesProps): ReactNode {
  if (id === undefined || !isFieldRow(content)) return content;

  return <MovableFieldRow id={id} content={content} />;
}
