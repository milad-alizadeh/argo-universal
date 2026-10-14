const client = (folder: string): string => `packages/client/src/${folder}/*`;

// A component folder shares its parent's waiver identity, so the move adds no waiver (ADR-0017, Component folders).
const componentFolders: [string, string[]][] = [
  [
    'features/composer/components',
    [
      'composer',
      'composer-configuration',
      'composer-options',
      'composer-popover',
      'composer-status',
      'start-session-in',
      'written-plan',
    ],
  ],
  [
    'features/connection/components',
    ['connection-banner', 'connection-detail-view'],
  ],
  [
    'features/feed/components',
    [
      'agent-message',
      'command-row',
      'diff-view',
      'edit-row',
      'feed',
      'feed-content',
      'feed-notice',
      'live-header',
      'tool-call-group',
      'tool-call-row',
      'user-message',
    ],
  ],
  [
    'features/frame/components',
    [
      'desktop-layout-view',
      'desktop-shell',
      'glass-surface',
      'panel-resize-handle',
      'phone-drawer',
      'phone-section-view',
      'phone-shell',
      'phone-shell-card',
      'shell-backdrop',
      'shell-pane',
    ],
  ],
  [
    'features/requests/components',
    [
      'elicitation-form',
      'permission-request',
      'plan-proposal-card',
      'plan-proposal-expansion',
      'request-card',
    ],
  ],
  [
    'features/sessions/components',
    [
      'new-session-view',
      'project-heading',
      'pull-request-indicator',
      'session-row',
      'session-view',
      'sessions-filter-menu',
      'sessions-list',
      'sessions-loading',
      'sessions-view',
    ],
  ],
  [
    'features/settings/components',
    [
      'placeholder-detail-view',
      'project-detail-view',
      'project-list-view',
      'settings-list',
    ],
  ],
  ['lib/generic', ['page-title-row', 'use-wide']],
  [
    'lib/generic/primitives',
    [
      'buttons/button',
      'buttons/button-group',
      'buttons/filter-pill',
      'buttons/icon-button',
      'buttons/menu-button',
      'display/badge',
      'display/collapsible',
      'display/icon',
      'fields/field-group',
      'fields/field-input',
      'fields/field-section',
      'inputs/combobox-search',
      'inputs/search-field',
      'inputs/select',
      'inputs/slider',
      'lists/list-item',
      'native',
      'overlays/alert',
      'overlays/bottom-sheet',
      'overlays/menu',
    ],
  ],
  ['lib/generic/symbols', ['symbol-glyph']],
  ['lib/product', ['field-list', 'screen', 'scroll-fade', 'status-indicator']],
  ['lib/product/markdown', ['code-block-title', 'feed-code-block']],
];

export const componentRelocations = componentFolders.flatMap(
  ([parent, folders]): [string, string[]][] =>
    folders.map((folder): [string, string[]] => [
      client(`${parent}/${folder}`),
      [client(parent)],
    ]),
);
