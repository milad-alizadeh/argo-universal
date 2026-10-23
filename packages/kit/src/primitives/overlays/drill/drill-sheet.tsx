import { useRouter } from 'expo-router';
import { cloneElement, useId, useLayoutEffect, type ReactElement } from 'react';
import {
  useOptionalSheet,
  type SheetNavigation,
} from '#primitives/overlays/sheet';
import { Page, type PageProps } from '#primitives/scaffolds/page';
import { usePushedPage } from '#pushed-page';
import { useCompletion, type Completion } from './drill-completion';
import type { DrillProps } from './drill-props';
import { useStandby } from './drill-standby';

type Props = DrillProps & { trigger: NonNullable<DrillProps['trigger']> };

/*
 * Choice belongs to the field; presentation and navigation belong to the stack that holds the row: the enclosing
 * Sheet's own stack, or else the screen's (a pushed page with a native header and Back). It never opens a Sheet of its
 * own.
 */
export function DrillSheet(props: Props): ReactElement {
  const presentation = useDrillPresentation(props);

  return cloneElement(props.trigger, { onPress: presentation.show });
}

type Presentation = { show: () => void };

function useDrillPresentation(props: DrillProps): Presentation {
  const parent = useOptionalSheet();
  const name = useId();
  const completion = useCompletion(props.onClose);
  useLiveDestination(props, { parent, name, onExit: completion.finish });
  const pushPage = useRoutedPage(props, completion);

  return { show: showChoices(props, { parent, name, completion, pushPage }) };
}

// The page pushed on the screen's own stack, where no Sheet holds the row; Back is the stack's.
function useRoutedPage(props: DrillProps, completion: Completion): () => void {
  const router = useRouter();

  return usePushedPage({
    content: () => (
      <Page title={props.title} {...pageSearch(props.search)}>
        {props.children(() => router.back(), props.search !== undefined)}
      </Page>
    ),
    onExit: completion.finish,
  });
}

const pageSearch = (
  search: DrillProps['search'],
): Pick<PageProps, 'search' | 'value' | 'onChangeText'> =>
  search
    ? {
        search: { label: search.label },
        value: search.value,
        onChangeText: search.onChangeText,
      }
    : {};

type DestinationOwner = {
  parent?: SheetNavigation;
  name: string;
  onExit: () => void;
};

function useLiveDestination(props: DrillProps, owner: DestinationOwner): void {
  const { parent, name, onExit } = owner;
  const standby = useStandby(props.mount);

  useLayoutEffect(() => {
    if (parent) hand(props, { parent, name, onExit, standby });
  }, [props, parent, name, onExit, standby]);
}

type Live = Required<Pick<DestinationOwner, 'parent'>> &
  Omit<DestinationOwner, 'parent'> & { standby: boolean };

// A page the sheet already holds is replaced where it stands; one on standby is handed over to be held.
function hand(props: DrillProps, live: Live): void {
  const page = {
    name: live.name,
    title: props.title,
    contentScrolls: props.contentScrolls,
    placeholder: props.placeholder,
    standby: live.standby,
    onExit: live.onExit,
    children: props.children(live.parent.back, false),
  };

  if (live.standby) live.parent.standby(page);
  else live.parent.update(page);
}

type Opening = {
  parent?: SheetNavigation;
  name: string;
  completion: Completion;
  pushPage: () => void;
};

function showChoices(props: DrillProps, opening: Opening): () => void {
  return (): void => {
    if (props.disabled) return;
    opening.completion.begin();

    if (opening.parent)
      pushChoices(props, opening.parent, {
        name: opening.name,
        onExit: opening.completion.finish,
      });
    else opening.pushPage();
  };
}

function pushChoices(
  props: DrillProps,
  parent: SheetNavigation,
  completion: { name: string; onExit: () => void },
): void {
  parent.push({
    ...completion,
    title: props.title,
    contentScrolls: props.contentScrolls,
    placeholder: props.placeholder,
    standby: props.mount === 'eager',
    children: props.children(parent.back, false),
  });
}
