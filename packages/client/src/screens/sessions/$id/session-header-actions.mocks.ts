import { fn } from 'storybook/test';
import {
  type DeclaredHeaderAction,
  placeSessionHeaderActions,
  type SessionPluginAction,
  type SessionPluginActions,
} from '#features/sessions';
import type {
  OpenSessionViewProps,
  SessionDetailViewProps,
} from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

// Three Plugins' declared actions in Slot order, as #1122's option A draws them: two ask for the header, one for the menu.
export const declaredHeaderActions: DeclaredHeaderAction[] = [
  {
    pluginId: 'issue-tracker',
    item: {
      id: 'issue',
      label: 'Open #412',
      icon: { sf: 'link', material: 'link' },
      placement: 'header',
      target: { type: 'page', path: '/issues/412' },
    },
  },
  {
    pluginId: 'deploys',
    item: {
      id: 'preview',
      label: 'Open preview',
      icon: { sf: 'shippingbox', material: 'deployed_code' },
      placement: 'header',
      target: { type: 'page', path: '/deploys/preview' },
    },
  },
  {
    pluginId: 'coverage',
    item: {
      id: 'report',
      label: 'Coverage report',
      icon: { sf: 'chart.bar', material: 'bar_chart' },
      placement: 'menu',
      target: { type: 'page', path: '/coverage' },
    },
  },
];

const pressable = (declared: DeclaredHeaderAction): SessionPluginAction => ({
  ...declared,
  onPress: fn(),
});

const showsAll = (): boolean => true;

// As a desktop or the web places them: the first header action beside "…", the rest inside it.
export const desktopPluginActions = (): SessionPluginActions =>
  placeSessionHeaderActions(declaredHeaderActions.map(pressable), {
    phone: false,
    shows: showsAll,
  });

// As iOS and Android place them: every one inside "…".
export const phonePluginActions = (): SessionPluginActions =>
  placeSessionHeaderActions(declaredHeaderActions.map(pressable), {
    phone: true,
    shows: showsAll,
  });

// An idle Session whose header carries the Plugins' actions as placed.
export const pluginActionsSession = (
  pluginActions: SessionPluginActions,
  header: OpenSessionViewProps['header'] = idleSession.header,
): SessionDetailViewProps => ({
  state: 'open',
  ...idleSession,
  header: { ...header, pluginActions },
});
