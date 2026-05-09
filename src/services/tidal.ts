import type { TidalOAuthSettings } from '../types';

const BASE_URL = 'https://openapi.tidal.com/v2';

const getAccessToken = (oauth: TidalOAuthSettings): string | undefined => {
    return oauth.accessToken;
};

const fetchAllPages = async (baseUrl: string, token: string): Promise<any[]> => {
    const allItems: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
        const url = `${baseUrl}?limit=${limit}&offset=${offset}`;
        console.log(`[Tidal API] Fetching page offset=${offset}, limit=${limit}`);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Tidal API] Request failed:', error);
            throw new Error(`API request failed (${response.status})`);
        }

        const data = await response.json();
        const items = data.items || [];

        console.log(`[Tidal API] Got ${items.length} items (total so far: ${allItems.length + items.length})`);
        allItems.push(...items);

        if (items.length < limit) {
            hasMore = false;
        } else {
            offset += limit;
        }
    }

    return allItems;
};

export const fetchUserPlaylists = async (oauth: TidalOAuthSettings) => {
    const token = getAccessToken(oauth);
    const userId = oauth.userId;
    if (!token || !userId) {
        console.error('[Tidal API] Missing token or userId for fetchUserPlaylists');
        return [];
    }

    const baseUrl = `${BASE_URL}/users/${userId}/playlists`;
    console.log('[Tidal API] Fetching ALL playlists for user', userId);

    try {
        const playlists = await fetchAllPages(baseUrl, token);
        console.log('[Tidal API] Total playlists fetched:', playlists.length);
        return playlists;
    } catch (error) {
        console.error('[Tidal API Error]', error);
        return [];
    }
};

export const fetchPlaylistTracks = async (playlistId: string, oauth: TidalOAuthSettings) => {
    const token = getAccessToken(oauth);
    if (!token) {
        console.error('[Tidal API] Missing token for fetchPlaylistTracks');
        return [];
    }

    const baseUrl = `${BASE_URL}/playlists/${playlistId}/items`;
    console.log('[Tidal API] Fetching ALL tracks for playlist:', playlistId.substring(0, 15) + '...');

    try {
        const tracks = await fetchAllPages(baseUrl, token);
        console.log(`[Tidal API] Total tracks fetched for playlist ${playlistId.substring(0, 8)}...: ${tracks.length}`);
        return tracks;
    } catch (error) {
        console.error('[Tidal API Error (Tracks)]', error);
        return [];
    }
};
