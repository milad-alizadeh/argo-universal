import { isRootOnly } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode, PluginViewId } from '@repo/contracts/plugins/wire';
import { Detail } from '@repo/kit/primitives/scaffolds/detail';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import {
  PluginTree,
  type PluginOnEvent,
} from '../../../lib/product/plugin-registry';

// What a page's tree reports back: the events its controls send, and the page a `navigate` Action opens.
export interface PluginPageCallbacks {
  onEvent: PluginOnEvent;
  onOpenPage?: OpenPluginPage;
}

export interface PluginDetailViewProps {
  // The page the Plugin draws; blank until the Server's first snapshot arrives.
  root: WireNode | null;
  title?: string;
  viewId?: PluginViewId | null;
  callbacks: PluginPageCallbacks;
}

// A Plugin's page, drawn by the App's registry; one that is not a Screen of its own scrolls in the kit's Detail, in the Screen's column.
export function PluginDetailView(
  props: PluginDetailViewProps,
): React.ReactNode {
  if (ownsPage(props.root)) return <PluginContent {...props} />;

  return (
    <Screen title={props.title ?? 'Plugin'}>
      <Detail testID="plugin-page">
        <PluginContent {...props} />
      </Detail>
    </Screen>
  );
}

// A root-only part, Screen or ListDetail, draws its own screen and header.
function ownsPage(root: WireNode | null): boolean {
  return root ? isRootOnly(root) : false;
}

function PluginContent(props: PluginDetailViewProps): React.ReactNode {
  return props.root ? (
    <PluginTree key={props.viewId} root={props.root} {...props.callbacks} />
  ) : null;
}
