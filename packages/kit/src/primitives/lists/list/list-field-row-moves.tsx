import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { useMoveActions } from './list-move-actions';
import { ListMovePicker } from './list-move-picker-drawing';
import { isNativeRow } from './list-native-row-mark';

interface FieldRowMovesProps {
  // The row's move id; a row the List cannot move has none.
  id: string | undefined;
  content: ReactNode;
}

function MovableFieldRow({
  id,
  content,
}: FieldRowMovesProps & { id: string }): ReactElement {
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

/*
 * A FieldGroup row that moves in a List drawn on LegendList, as the web draws a grouped List: its context menu offers
 * the Move Section a ListItem's does, and its Move to… picker opens over it, so every move a drag makes can be made
 * from the keyboard too. A ListItem draws its own; any other row draws as it is.
 */
export function FieldRowMoves(props: FieldRowMovesProps): ReactNode {
  const { id, content } = props;
  const fieldRow = isValidElement(content) && isNativeRow(content);

  if (!fieldRow || id === undefined) return content;

  return <MovableFieldRow id={id} content={content} />;
}
