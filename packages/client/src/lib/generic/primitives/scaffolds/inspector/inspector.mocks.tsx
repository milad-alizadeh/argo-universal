import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import { Inspector } from './inspector';
import {
  createInspectorHost,
  type InspectorHost,
  InspectorHostContext,
  useHostedInspector,
} from './inspector-host';
import { InspectorPane, type InspectorPaneProps } from './inspector-pane';

const ignore = (): void => {};

const handlers = { onOpenChange: ignore, onExpandedChange: ignore };

export const inspectorTitle = 'Changes';

export const contentText = 'packages/client/src/app.tsx';

export const branchesText = 'Branches page';

export const openLabel = 'Show changes';

// The Inspector's content: a changed file, and a button that pushes a page in a sheet.
function InspectorContent(): ReactElement {
  return (
    <View className="gap-2 p-4">
      <Text>{contentText}</Text>
      <BranchesButton />
    </View>
  );
}

const branchesPage = {
  name: 'branches',
  title: 'Branches',
  children: <Text>{branchesText}</Text>,
};

// A part of the Inspector, such as Changes' Compare Against, pushing its own page; only a sheet has pages.
function BranchesButton(): ReactElement | null {
  const sheet = useOptionalSheet();

  if (!sheet) return null;

  return (
    <Button
      label="Show branches"
      variant="outline"
      onPress={() => sheet.push(branchesPage)}
    />
  );
}

const copyPath = (
  <ActionList>
    <Action label="Copy path" icon="copy" onPress={ignore} />
  </ActionList>
);

const example = { title: inspectorTitle, actions: copyPath };

// A page whose own header action opens its Inspector; the Inspector beside it, or in a sheet under wide.
export function ExampleInspector(props: {
  initiallyOpen?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(props.initiallyOpen ?? false);

  return (
    <View className="flex-1 flex-row bg-content">
      <ExamplePage onToggle={() => setOpen(!open)} />
      <Inspector {...example} open={open} onOpenChange={setOpen}>
        <InspectorContent />
      </Inspector>
    </View>
  );
}

function ExamplePage(props: { onToggle: () => void }): ReactElement {
  return (
    <View testID="example-page" className="flex-1 items-start p-4">
      <Button label={openLabel} onPress={props.onToggle} />
    </View>
  );
}

// A host such as the App Frame: the page's Inspector draws in its column, and the host holds its expansion.
export function HostedExampleInspector(): ReactElement {
  const [host] = useState(createInspectorHost);

  return (
    <View className="flex-1 flex-row">
      <View className="flex-1">
        <InspectorHostContext value={host}>
          <ExampleInspector />
        </InspectorHostContext>
      </View>
      <HostColumn host={host} />
    </View>
  );
}

function HostColumn({ host }: { host: InspectorHost }): ReactElement | null {
  const hosted = useHostedInspector(host);
  const [expanded, onExpandedChange] = useState(false);

  if (!hosted?.open) return null;

  return (
    <View testID="host-column" className={hostColumnClass(expanded)}>
      <InspectorPane {...hosted} {...{ expanded, onExpandedChange }} />
    </View>
  );
}

const hostColumnClass = (expanded: boolean): string =>
  expanded ? 'absolute inset-0' : 'w-frame-inspector';

interface ExamplePaneProps {
  expanded?: boolean;
  actions?: boolean;
}

const paneOf = (props: ExamplePaneProps): InspectorPaneProps => ({
  ...handlers,
  title: inspectorTitle,
  open: true,
  expanded: props.expanded,
  actions: props.actions && copyPath,
});

// The pane alone, as the wide column draws it.
export function ExamplePane(props: ExamplePaneProps): ReactElement {
  return (
    <View className="h-120 w-frame-inspector">
      <InspectorPane {...paneOf(props)}>
        <InspectorContent />
      </InspectorPane>
    </View>
  );
}
