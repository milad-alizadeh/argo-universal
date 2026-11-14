import '@expo/metro-runtime';
/*
 * Before anything imports Uniwind: its web style scan runs at import, and a first render
 * before the stylesheet is known resolves every accent-* class to no colour.
 */
import './global.css';
/*
 * Load story args before React attaches navigation owners to JSX.
 * Metro replaces Storybook with its empty stub in production.
 */
import './.rnstorybook';
import 'expo-router/entry';
