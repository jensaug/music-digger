import { fetchUserPlaylists, fetchPlaylistTracks } from './tidal';
import { ensureValidToken } from './settings';
import type { UserSettings } from '../types';

interface PlaylistArtist {
    name: string;
    count: number;
    image?: string;
}

export const analyzePlaylists = async (settings: UserSettings): Promise<PlaylistArtist[]> => {
    if (!settings.tidalOAuth) {
        throw new Error("Tidal OAuth not configured");
    }

    const validSettings = await ensureValidToken(settings);
    if (!validSettings.tidalOAuth) {
        throw new Error("Tidal OAuth not configured");
    }

    const playlists = await fetchUserPlaylists(validSettings.tidalOAuth);

    const artistMap = new Map<string, PlaylistArtist>();

    const playlistsToAnalyze = playlists.slice(0, 20);

    const promises = playlistsToAnalyze.map(async (playlist: any) => {
        const items = await fetchPlaylistTracks(playlist.uuid, validSettings.tidalOAuth!);

        items.forEach((item: any) => {
            const track = item.item;
            if (!track || !track.artists) return;

            track.artists.forEach((artist: any) => {
                const existing = artistMap.get(artist.name);
                if (existing) {
                    existing.count++;
                } else {
                    artistMap.set(artist.name, {
                        name: artist.name,
                        count: 1,
                    });
                }
            });
        });
    });

    await Promise.all(promises);

    const sortedArtists = Array.from(artistMap.values()).sort((a, b) => b.count - a.count);

    return sortedArtists;
};
