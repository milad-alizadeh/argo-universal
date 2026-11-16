import { use, type ReactNode } from 'react';
import { AsidePlaceContext } from '#kit/aside-place-context';
import { List, ListSection } from '#primitives/lists/list';
import { AsideFields, PillFields } from './properties-aside';
import type { PropertiesDrawing } from './properties-drawing';
import {
  PropertiesDrawingContext,
  useResolvedPropertiesDrawing,
} from './properties-place';
import { holdsProperties, propertySections } from './property-rows';

// One section of a read-only FieldGroup: its title, and the fields its rows show.
export interface PropertySectionProps {
  title?: string;
  children: ReactNode;
}

const listOptions = { padding: 0, paddingTop: 0, paddingBottom: 0 } as const;

const roots = {
  'list-section': ListSectionRoot,
  'grouped-rows': GroupedRows,
  aside: AsideFields,
  pills: PillFields,
  icons: PillFields,
} satisfies Record<
  PropertiesDrawing['root'],
  (props: PropertySectionProps) => ReactNode
>;

/*
 * A FieldGroup draws read-only, as the page's properties, in a Screen's aside, or where a row's value is kit
 * components, which SwiftUI's Form and a Compose tree cannot hold (ADR-0058).
 */
export function useDrawsProperties(children: ReactNode): boolean {
  const place = use(AsidePlaceContext);

  return place !== null || holdsProperties(children);
}

/*
 * A read-only FieldGroup draws the root its drawing names (properties-drawing.ts) for each section and gives that
 * drawing to its fields. Inside a List, such as a Settings page, a section is one more section of it.
 */
export function FieldGroupProperties(props: {
  children?: ReactNode;
}): ReactNode {
  const drawing = useResolvedPropertiesDrawing();
  const Root = roots[drawing.root];

  return (
    <PropertiesDrawingContext value={drawing}>
      {propertySections(props.children).map((section) => (
        <Root key={section.key} title={section.title}>
          {section.fields}
        </Root>
      ))}
    </PropertiesDrawingContext>
  );
}

function ListSectionRoot({ title, children }: PropertySectionProps): ReactNode {
  return <ListSection title={title}>{children}</ListSection>;
}

// A Detail's scroll view gives a List no height to fill: a phone draws the rows as one grouped section that takes its own.
function GroupedRows({ title, children }: PropertySectionProps): ReactNode {
  return (
    <List {...listOptions} appearance="grouped">
      <ListSection title={title}>{children}</ListSection>
    </List>
  );
}
