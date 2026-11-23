import { defineConfig } from 'vite';
import { sidebarGlassBuild } from '../../tools/sidebar-glass-build.mjs';

export default defineConfig({ plugins: [sidebarGlassBuild()] });
