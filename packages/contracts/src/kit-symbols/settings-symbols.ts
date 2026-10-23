// The Settings pages' own icons: Appearance, Notifications and Plugins (a puzzle piece), and a plug for a Plugin's icon, the gear and the sidebar toggle.
export const settingsSymbols = {
  appearance: { sf: 'circle.lefthalf.filled', material: 'contrast' },
  notifications: { sf: 'bell', material: 'notifications' },
  plug: { sf: 'powerplug', material: 'power' },
  settings: {
    sf: 'gearshape',
    sfFilled: 'gearshape.fill',
    material: 'settings',
  },
  sidebar: {
    sf: 'sidebar.left',
    sfFilled: 'rectangle.leftthird.inset.filled',
    material: 'side_navigation',
  },
  plugins: { sf: 'puzzlepiece.extension', material: 'extension' },
} as const;
