// Display identity is independent from the names existing installations and integrations use.
export const productName = 'Argo';

// Changing these values needs a compatibility migration, not a product rename.
export const productCompatibility = {
  command: 'argo',
  directory: '.argo',
  databaseFile: 'argo.db',
  projectsDirectory: 'Argo',
  discoveryService: 'argo',
  discoveryHostPrefix: 'argo',
  linkScheme: 'argo',
  mcpServer: 'argo',
  // The launcher and pi extension a pi Session starts through, beside the CLI launcher (ADR-0053).
  piLauncher: 'argo-pi',
  piExtension: 'argo-pi-extension.ts',
  desktopBridge: 'argo',
  feedMetadata: 'argo',
  pairingPrologue: 'argo-pairing/1',
  channelMagic: 'ARGO',
  linkPreviewUserAgent: 'Argo-LinkPreview',
  environment: {
    home: 'ARGO_HOME',
    token: 'ARGO_TOKEN',
    projectsDirectory: 'ARGO_PROJECTS_DIR',
    // `0` tells `argo mcp` to leave the checklist instruction out (ADR-0053).
    todoList: 'ARGO_TODO_LIST',
    // The pi command the person set, which the pi launcher runs in place of `pi`.
    piCommand: 'ARGO_PI_COMMAND',
  },
} as const;
