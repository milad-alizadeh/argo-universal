import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  useReducer,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { PluginOnEvent } from '../plugin-dispatcher';
import { Overlays, type OpenOverlay, type PluginActions } from './overlays';
import { PluginAlert } from './plugin-alert';
import type { OverlayProps } from './plugin-overlay-types';
import { PluginPanel } from './plugin-panel';

type OverlayTree = ComponentType<{
  root: WireNode;
  onEvent: PluginOnEvent;
  actions: PluginActions;
}>;

// An overlay's content shares its opener's Actions, so only the outermost tree hosts the overlay.
export function usePluginActions(
  inherited: PluginActions | undefined,
  Tree: OverlayTree,
): [PluginActions, ReactNode] {
  const [, update] = useReducer((revision: number) => revision + 1, 0);
  const [overlays] = useState(() => new Overlays(update));

  if (inherited) return [inherited, null];

  return [
    overlays,
    <PluginOverlay key="overlay" actions={overlays} Tree={Tree} />,
  ];
}

type PluginOverlayProps = Pick<OverlayProps, 'actions'> & { Tree: OverlayTree };

function PluginOverlay({
  actions,
  Tree,
}: PluginOverlayProps): React.JSX.Element | null {
  if (!actions.overlay) return null;
  const renderContent = contentRenderer(actions, Tree);
  const props = { actions, opened: actions.overlay, renderContent };

  return actions.overlay.action.action === 'alert' ? (
    <PluginAlert key={actions.overlay.id} {...props} />
  ) : (
    <PluginPanel key={actions.overlay.id} {...props} />
  );
}

function contentRenderer(
  actions: Overlays,
  Tree: OverlayTree,
): OverlayProps['renderContent'] {
  return (opened) => (
    <Tree
      root={opened.action.content}
      onEvent={overlayEvents(opened)}
      actions={actions}
    />
  );
}

function overlayEvents({ target }: OpenOverlay): PluginOnEvent {
  return (_key, interaction) => {
    if (interaction.event !== 'onAction')
      throw new Error('Overlay handler has no stable reference');

    return target.send(target.key, interaction);
  };
}
