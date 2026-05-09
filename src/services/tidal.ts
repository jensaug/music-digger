import type { TidalOAuthSettings } from '../types';

const BASE_URL = 'https://api.tidal.com/v1';

const getAccessToken = (oauth: TidalOAuthSettings): string | undefined => {
    return oauth.accessToken;
};

export const fetchUserPlaylists = async (oauth: TidalOAuthSettings) => {
    const token = getAccessToken(oauth);
    const userId = oauth.userId;
    if (!token || !userId) return [];

    try {
        const response = await fetch(`${BASE_URL}/users/${userId}/playlists?limit=50`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch playlists');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Tidal API Error", error);
        return [];
    }
};

export const fetchPlaylistTracks = async (playlistId: string, oauth: TidalOAuthSettings) => {
    const token = getAccessToken(oauth);
    if (!token) return [];

    try {
        const response = await fetch(`${BASE_URL}/playlists/${playlistId}/items?limit=50`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch playlist tracks');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Tidal API Error (Tracks)", error);
        return [];
    }
};
