import type { UserSettings } from '../types';
import { isTokenExpired, refreshAccessToken, fetchUserId } from './tidal-oauth';

const SETTINGS_KEY = 'music-digger-settings';

export const getSettings = (): UserSettings => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    let settings: UserSettings = {
        lastfmUsername: '',
        lastfmApiKey: ''
    };

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            settings = { ...settings, ...parsed };
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }

    if (!settings.lastfmUsername) settings.lastfmUsername = import.meta.env.VITE_LASTFM_USERNAME || '';
    if (!settings.lastfmApiKey) settings.lastfmApiKey = import.meta.env.VITE_LASTFM_API_KEY || '';

    if (!settings.tidalOAuth) {
        const clientId = import.meta.env.VITE_TIDAL_CLIENT_ID || '';
        const clientSecret = import.meta.env.VITE_TIDAL_CLIENT_SECRET || '';
        if (clientId && clientSecret) {
            settings.tidalOAuth = { clientId, clientSecret };
        }
    }

    return settings;
};

export const saveSettings = (settings: UserSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const ensureValidToken = async (settings: UserSettings): Promise<UserSettings> => {
    if (!settings.tidalOAuth?.clientId || !settings.tidalOAuth?.clientSecret) {
        throw new Error("Tidal OAuth not configured");
    }

    if (!settings.tidalOAuth.accessToken || !settings.tidalOAuth.refreshToken) {
        throw new Error("Not connected to Tidal. Please authorize first.");
    }

    if (isTokenExpired(settings.tidalOAuth)) {
        const refreshed = await refreshAccessToken(settings.tidalOAuth);
        settings.tidalOAuth = refreshed;
        saveSettings(settings);

        if (!settings.tidalOAuth.userId) {
            const userId = await fetchUserId(refreshed.accessToken!);
            if (userId) {
                settings.tidalOAuth.userId = userId;
                saveSettings(settings);
            }
        }
    }

    return settings;
};
