import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // The system opens `argo://` Screen links in this app; `app://app` stays internal.
    protocols: [{ name: 'Argo', schemes: ['argo'] }],
    // Argo runs on macOS 15 and later, the oldest system with SF Symbols 6.0 (ADR-0029).
    extendInfo: { LSMinimumSystemVersion: '15.0' },
  },
  rebuildConfig: {},
  // Release packaging is out of scope for now, so the generated makers are removed.
  makers: [],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      // Desktop has no UI of its own; the window loads the universal app's web build (ADR 0001).
      renderer: [],
    }),
    // Fuses switch Electron features off at package time, before code signing.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
