import {
  type Navigate,
  type NavigationDestination,
  sectionDestination,
  sectionOf,
  useWide,
} from '@repo/client';
import { router } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { hrefFor, paramsOf } from './routes';
import { useDestination } from './use-destination';

// Where the shell is: the shown destination and whether the window is wide.
interface ShellPlace {
  destination: NavigationDestination;
  wide: boolean;
}

type NavigateOptions = Parameters<Navigate>[1];

const isPage = (destination: NavigationDestination): boolean =>
  destination.to !== sectionDestination(sectionOf(destination)).to;

const samePageSection = (
  shown: NavigationDestination,
  next: NavigationDestination,
): boolean => sectionOf(shown) === sectionOf(next) && isPage(shown);

// A wide window shows one page beside its section's list: another page there swaps out the shown one, so under it the stack keeps only the list for a narrow window's Back.
const swapsPage = (place: ShellPlace, next: NavigationDestination): boolean =>
  place.wide && isPage(next) && samePageSection(place.destination, next);

const replaces = (
  place: ShellPlace,
  destination: NavigationDestination,
  options: NavigateOptions,
): boolean => options?.replace === true || swapsPage(place, destination);

function move(
  place: ShellPlace,
  destination: NavigationDestination,
  options: NavigateOptions,
): void {
  const go = replaces(place, destination, options)
    ? router.replace
    : router.navigate;

  go(hrefFor(destination));
}

interface ShellNavigation {
  navigate: Navigate;
  onPlaceChange: (place: ShellPlace) => void;
}

// Screens in @repo/client navigate through `navigate`, which knows where the shell is from `ShellPlaceTracker`.
function shellNavigation(): ShellNavigation {
  let place: ShellPlace = { destination: { to: 'sessions' }, wide: false };

  return {
    navigate: (destination, options) => {
      if (options?.inPlace) router.setParams(paramsOf(destination));
      else move(place, destination, options);
    },
    onPlaceChange: (next) => {
      place = next;
    },
  };
}

export function useShellNavigation(): ShellNavigation {
  return useState(shellNavigation)[0];
}

// Reports where the shell is, re-rendering only itself on each route change.
export function ShellPlaceTracker({
  onPlaceChange,
}: Pick<ShellNavigation, 'onPlaceChange'>): null {
  const destination = useDestination();
  const wide = useWide();

  useLayoutEffect(() => {
    onPlaceChange({ destination, wide });
  }, [onPlaceChange, destination, wide]);

  return null;
}
