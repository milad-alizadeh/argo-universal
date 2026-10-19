import '@expo/metro-runtime';
/*
 * Load story args before React attaches navigation owners to JSX.
 * Metro replaces Storybook with its empty stub in production.
 */
import './.rnstorybook';
import 'expo-router/entry';
