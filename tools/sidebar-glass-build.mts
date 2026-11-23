import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export function sidebarGlassBuild(): Plugin {
  const source = fileURLToPath(
    new URL('../apps/desktop/native/sidebar-glass.mm', import.meta.url),
  );

  return {
    name: 'argo-sidebar-glass',
    buildStart() {
      const platform =
        process.env.ARGO_DESKTOP_BUILD_PLATFORM ?? process.platform;

      if (platform !== 'darwin' || process.platform !== 'darwin') return;

      this.addWatchFile(source);
      const directory = mkdtempSync(path.join(tmpdir(), 'argo-sidebar-glass-'));
      const binary = path.join(directory, 'sidebar-glass.node');

      try {
        execFileSync(
          '/usr/bin/xcrun',
          [
            'clang++',
            '-std=c++17',
            '-arch',
            'arm64',
            '-arch',
            'x86_64',
            '-mmacosx-version-min=15.0',
            '-fobjc-arc',
            '-bundle',
            '-Wl,-undefined,dynamic_lookup',
            '-framework',
            'AppKit',
            '-I',
            path.resolve(path.dirname(process.execPath), '../include/node'),
            source,
            '-o',
            binary,
          ],
          { env: { ...process.env, TMPDIR: directory } },
        );
        execFileSync('/usr/bin/codesign', ['--force', '--sign', '-', binary]);
        this.emitFile({
          type: 'asset',
          fileName: 'sidebar-glass.node',
          source: readFileSync(binary),
        });
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}
