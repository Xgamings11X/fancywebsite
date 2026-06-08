import { Settings } from './storage.js';
export function getSettings() { return Settings.get(); }
export function getSetting(key, fallback = '') { return Settings.getKey(key, fallback); }
