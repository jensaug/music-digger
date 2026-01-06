// Tidal API is restricted and requires specific token handling.
// This service acts as a placeholder or "bring your own token" implementation.

const BASE_URL = 'https://api.tidal.com/v1';

export const fetchUserPlaylists = async (userId: string, token: string) => {
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
}

export const fetchPlaylistTracks = async (playlistId: string, token: string) => {
    if (!token) return [];

    try {
        // Limit to 50 tracks for now to avoid pagination complexity in this iteration
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
}

export const fetchTidalUserId = async (token: string): Promise<string | null> => {
    if (!token) return null;
    try {
        const response = await fetch(`${BASE_URL}/sessions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.userId ? data.userId.toString() : null;
    } catch (error) {
        console.error("Failed to fetch Tidal User ID", error);
        return null;
    }
};
