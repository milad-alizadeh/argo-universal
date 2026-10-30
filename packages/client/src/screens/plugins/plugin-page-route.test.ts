import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { pluginSectionId } from '../../lib/product/navigation/sections';
import {
  pluginPagePath,
  pluginPageRoute,
  segmentsOf,
} from './plugin-page-route';
import type { PluginSection } from './use-plugin-sections';

const nav = (pluginId: string, navId: string, path: string): PluginSection => ({
  id: pluginSectionId(pluginId, navId),
  pluginId,
  name: pluginId,
  title: navId,
  icon: iconSymbols.plug,
  navId,
  navPath: segmentsOf(path),
  rootPath: `/plugins/${pluginId}/${navId}`,
});

const sections = [
  nav('tracker', 'issues', '/issues'),
  nav('tracker', 'boards', '/boards'),
  nav('example', 'example', '/'),
];

const inIssues = pluginSectionId('tracker', 'issues');

describe('pluginPageRoute', () => {
  it('opens a page under the nav item the App is showing', () => {
    expect(
      pluginPageRoute(
        sections,
        { pluginId: 'tracker', current: inIssues },
        '/issues/project-1',
      ),
    ).toEqual(['tracker', 'issues', 'issues', 'project-1']);
  });

  it('opens a page under the Plugin nav item whose path it sits below, from another section', () => {
    expect(
      pluginPageRoute(
        sections,
        { pluginId: 'tracker', current: inIssues },
        '/boards/sprint',
      ),
    ).toEqual(['tracker', 'boards', 'boards', 'sprint']);
  });

  it('opens a page from a core page, such as a Slot, under the nav item that holds it', () => {
    expect(
      pluginPageRoute(
        sections,
        { pluginId: 'tracker', current: 'settings' },
        '/issues',
      ),
    ).toEqual(['tracker', 'issues', 'issues']);
  });

  it('keeps a root nav item for every page below the Plugin', () => {
    expect(
      pluginPageRoute(
        sections,
        { pluginId: 'example', current: 'sessions' },
        '/builds/web',
      ),
    ).toEqual(['example', 'example', 'builds', 'web']);
  });

  it.each([
    { pluginId: 'tracker', path: '/unknown' },
    { pluginId: 'missing', path: '/issues' },
  ])('has no route for a page no nav item holds: $path', (origin) => {
    expect(
      pluginPageRoute(sections, { ...origin, current: inIssues }, origin.path),
    ).toBeUndefined();
  });
});

describe('pluginPagePath', () => {
  it('names the page below the Plugin id and the nav id', () => {
    expect(pluginPagePath(['tracker', 'issues', 'issues', 'project-1'])).toBe(
      '/issues/project-1',
    );
  });

  it('names a nav item with a root path `/`', () => {
    expect(pluginPagePath(['example', 'example'])).toBe('/');
  });
});
