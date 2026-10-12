import type * as React from 'react';
import { type ReactNode, type RefObject, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  type TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { iconButtonClasses } from '../../buttons/icon-button/icon-button-styles';
import {
  type SearchFieldGeometry,
  useSearchProgress,
} from './search-field-motion';
import { Lens, OpenField, QueryInput, RestRow } from './search-field-parts';

export interface SearchFieldProps {
  // Names the search button and the field, and shows as the placeholder, such as "Search Agents".
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  // The row the open field replaces: the title, then other actions. Search always comes last.
  title: ReactNode;
  actions?: ReactNode;
}

interface Morph {
  open: boolean;
  progress: SharedValue<number>;
  geometry: SearchFieldGeometry;
}

const searchRowHeight = 40;

/*
 * Header and list search: a search button, last in its row, that morphs into a field over the whole row.
 * Closing clears the query. Pickers and sheets draw their own search, never this one.
 */
export function SearchField(props: SearchFieldProps): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  const [geometry, measureRow, measureTrigger] = useGeometry();
  // A query left over from before, such as a restored screen, keeps the field open.
  const [open, setOpen] = useState(props.value !== '');
  const morph = { open, progress: useSearchProgress(open), geometry };
  return (
    <View
      className="h-10 min-w-0 flex-1 flex-row items-center gap-1"
      style={
        Platform.OS === 'web'
          ? undefined
          : { height: searchRowHeight * Math.max(1, fontScale) }
      }
      onLayout={measureRow}
    >
      <RestRow {...morph} title={props.title} actions={props.actions} />
      <SearchControls
        {...props}
        morph={morph}
        setOpen={setOpen}
        onTriggerLayout={measureTrigger}
      />
    </View>
  );
}

type LayoutHandler = NonNullable<React.ComponentProps<typeof View>['onLayout']>;

function useGeometry(): [SearchFieldGeometry, LayoutHandler, LayoutHandler] {
  const [rowWidth, setRowWidth] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState(0);
  return [
    { rowWidth, triggerWidth },
    ({ nativeEvent }) => setRowWidth(nativeEvent.layout.width),
    ({ nativeEvent }) => setTriggerWidth(nativeEvent.layout.width),
  ];
}

interface ControlsProps extends SearchFieldProps {
  morph: Morph;
  setOpen: (open: boolean) => void;
  onTriggerLayout: LayoutHandler;
}

// Closing hands focus back to the search button, so the keyboard keeps its place.
function SearchControls(props: ControlsProps): React.JSX.Element {
  const input = useRef<TextInput>(null);
  const trigger = useRef<View>(null);
  const close = (): void => {
    props.setOpen(false);
    props.onChangeText('');
    input.current?.blur();
    trigger.current?.focus();
  };
  return (
    <>
      <SearchTrigger {...props} trigger={trigger} input={input} />
      <OpenField {...props.morph} onClose={close}>
        <QueryInput
          ref={input}
          label={props.label}
          value={props.value}
          onChangeText={props.onChangeText}
          editable={props.morph.open}
          onEscape={close}
        />
      </OpenField>
      <Lens {...props.morph} />
    </>
  );
}

function SearchTrigger({
  trigger,
  input,
  ...props
}: ControlsProps & {
  trigger: RefObject<View | null>;
  input: RefObject<TextInput | null>;
}): React.JSX.Element {
  const { open } = props.morph;
  const openSearch = (): void => {
    props.setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
  };
  return (
    <Pressable
      ref={trigger}
      accessibilityLabel={props.label}
      accessibilityState={{ expanded: open }}
      aria-hidden={open}
      focusable={!open}
      pointerEvents={open ? 'none' : 'auto'}
      role="button"
      onPress={openSearch}
      onLayout={props.onTriggerLayout}
      className={iconButtonClasses({ variant: 'ghost', size: 'sm' })}
    />
  );
}
