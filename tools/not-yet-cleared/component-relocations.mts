const client = (folder: string): string => `packages/client/src/${folder}/*`;

// A component folder shares its parent's waiver identity, so the move adds no waiver (ADR-0017, Component folders).
const componentFolders: [string, string[]][] = [
  [
    'features/composer/components',
    [
      'composer',
      'composer-configuration',
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
      'frame-backdrop',
      'frame-pane',
      'frame-rail',
      'glass-surface',
      'panel-resize-handle',
      'phone-drawer',
      'phone-section-view',
      'compact-frame',
      'phone-shell-card',
    ],
  ],
  [
    'features/requests/components',
    ['elicitation-form', 'permission-request', 'request-card'],
  ],
  [
    'features/sessions/components',
    [
      'new-session-view',
      'project-heading',
      'pull-request-indicator',
      'session-row',
      'session-view',
      'sessions-list',
      'sessions-loading',
      'sessions-view',
      'sessions-view-menu',
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
      'actions/button',
      'inputs/filter-pill',
      'actions/icon-button',
      'status/badge',
      'layout/collapsible',
      'content/icon',
      'inputs/combobox-search',
      'inputs/search-field',
      'inputs/slider',
      'inputs/text-input',
      'lists/grouped-list',
      'lists/grouped-list-item',
      'lists/grouped-list-section',
      'overlays/alert',
      'overlays/sheet',
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
