import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useCardHeadingInset } from '#kit/list-look-context';
import { useWide } from '#kit/use-wide/use-wide';
import {
  type ClaimState,
  type ColumnClaim,
  claimState,
  type ContentColumn,
  counted,
  noClaims,
  type PartLayout,
  partLayout,
} from './column-layout';

export type { ColumnClaim, ContentColumn, PartLayout };

export { inColumn } from './column-style';

export { fieldGroupColumnStyle } from './grouped-column-style';

/*
 * Who keeps to a Screen's content column. A Screen part offers its column; a scroll view or grouped cards claim it and
 * keep to it themselves, and the part pads anything else; a popover, a sheet's page or a FieldGroup's rows are outside
 * it, so nothing they hold takes the column or claims it from the Screen behind them.
 */
interface Scope {
  state: ClaimState;
  claim: (claim: ColumnClaim) => () => void;
}

interface Here {
  column?: ContentColumn;
  scope?: Scope;
}

const outside: Here = {};

const ColumnContext = createContext<Here>(outside);

function useScope(): Scope {
  const [claims, setClaims] = useState(noClaims);
  const state = useMemo(() => claimState(claims), [claims]);

  const claim = useCallback((kind: ColumnClaim) => {
    setClaims(counted(kind, 1));

    return (): void => setClaims(counted(kind, -1));
  }, []);

  return useMemo(() => ({ state, claim }), [state, claim]);
}

// Before the first paint, so a part never pads what keeps to the column itself.
function useClaimOn(
  scope: Scope | undefined,
  kind: ColumnClaim | undefined,
): void {
  const claim = scope?.claim;

  useLayoutEffect(() => (kind ? claim?.(kind) : undefined), [claim, kind]);
}

function useProvide(here: Here, children: ReactNode): ReactElement {
  const { column, scope } = here;
  const value = useMemo(() => ({ column, scope }), [column, scope]);

  return createElement(ColumnContext, { value }, children);
}

/*
 * A Screen's: its heading learns whether its content is grouped cards. The Screen keeps its own column, so one inside
 * another's content claims the outer column, and what it is offered passes on to its content.
 */
export function ColumnScope(props: { children: ReactNode }): ReactElement {
  const outer = use(ColumnContext);
  const scope = useScope();
  useClaimOn(outer.scope, 'fill');

  return useProvide({ column: outer.column, scope }, props.children);
}

/*
 * One part of a Screen's body: it learns who claims what it holds, offers them its column, and draws itself from the
 * layout. Grouped cards in it move the Screen's heading, and a side column in it widens the Screen's column.
 */
export function ColumnPart(props: {
  column: ContentColumn;
  children: (layout: PartLayout) => ReactNode;
}): ReactElement {
  const outer = use(ColumnContext);
  const scope = useScope();
  useClaimOn(outer.scope, scope.state.grouped ? 'grouped' : undefined);
  useClaimOn(outer.scope, scope.state.side ? 'side' : undefined);
  const layout = usePartLayout(scope.state, props.column, outer.column);

  return useProvide({ column: layout.offered, scope }, props.children(layout));
}

const usePartLayout = (
  state: ClaimState,
  column: ContentColumn,
  inherited: ContentColumn | undefined,
): PartLayout => partLayout(state, { wide: useWide(), column, inherited });

// What it holds is offered this column, or none once a scroll view has taken it.
export function OfferColumn(props: {
  column?: ContentColumn;
  children: ReactNode;
}): ReactElement {
  const { scope } = use(ColumnContext);

  return useProvide({ column: props.column, scope }, props.children);
}

// A surface of its own: nothing it holds takes the column or claims it from the Screen behind it.
export const OutsideColumn = (props: { children: ReactNode }): ReactElement =>
  createElement(ColumnContext, { value: outside }, props.children);

// Content that keeps to the column itself claims it while drawn; it takes the column it is offered, if any.
export function useClaimColumn(claim?: ColumnClaim): ContentColumn | undefined {
  const here = use(ColumnContext);
  useClaimOn(here.scope, claim);

  return here.column;
}

// Content that draws a side column beside itself says so while drawn, so the Screen's capped column makes room for it.
export function useClaimSide(drawn: boolean): void {
  useClaimOn(use(ColumnContext).scope, drawn ? 'side' : undefined);
}

// Whether the Screen's content draws a side column, for its column to widen by.
export const useSideColumn = (): boolean =>
  use(ColumnContext).scope?.state.side ?? false;

// A Screen heading's inset, so a narrow web heading over grouped cards starts on their rows' text.
export function useHeadingInset(): number {
  const grouped = use(ColumnContext).scope?.state.grouped ?? false;

  return useCardHeadingInset(grouped);
}
