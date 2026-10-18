import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { ListFooter } from '../../../list-footer';
import type { KitProps } from '../../kit-props';
import { ListItemFrame } from './list-item';

export type ListItemButtonProps = KitProps<'ListItem.Button'>;

export function ListItemButton(props: ListItemButtonProps): ReactElement {
  if (Platform.OS === 'android' && props.tone === 'danger')
    return <DangerAction {...props} />;

  return <ListItemFrame {...props} role="button" />;
}

function DangerAction(props: ListItemButtonProps): ReactElement {
  return (
    <View>
      <Button
        label={props.title}
        tone="danger"
        variant="ghost"
        disabled={props.disabled}
        onPress={props.onPress}
      />
      {props.description ? <ListFooter text={props.description} /> : null}
    </View>
  );
}
