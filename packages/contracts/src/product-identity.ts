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
  desktopBridge: 'argo',
  feedMetadata: 'argo',
  pairingPrologue: 'argo-pairing/1',
  channelMagic: 'ARGO',
  linkPreviewUserAgent: 'Argo-LinkPreview',
  environment: {
    home: 'ARGO_HOME',
    token: 'ARGO_TOKEN',
    projectsDirectory: 'ARGO_PROJECTS_DIR',
  },
} as const;
