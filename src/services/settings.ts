import type { UserSettings } from '../types';

const SETTINGS_KEY = 'music-digger-settings';

export const getSettings = (): UserSettings => {
    // 1. Try to get from local storage
    const stored = localStorage.getItem(SETTINGS_KEY);
    let settings: UserSettings = {
        lastfmUsername: '',
        lastfmApiKey: '',
        tidalToken: '',
        tidalUserId: ''
    };

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return { ...settings, ...parsed };
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }

    // 2. Fallback to Env Vars if local storage is empty or specific fields missing calling this overrides if we want Env to be default?
    // Usually env vars are defaults, and user overrides them.
    // So we use env vars if the current value is empty.

    if (!settings.lastfmUsername) settings.lastfmUsername = import.meta.env.VITE_LASTFM_USERNAME || '';
    if (!settings.lastfmApiKey) settings.lastfmApiKey = import.meta.env.VITE_LASTFM_API_KEY || '';
    if (!settings.tidalToken) settings.tidalToken = import.meta.env.VITE_TIDAL_TOKEN || '';
    if (!settings.tidalUserId) settings.tidalUserId = import.meta.env.VITE_TIDAL_USER_ID || '';

    return settings;
};

export const saveSettings = (settings: UserSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
