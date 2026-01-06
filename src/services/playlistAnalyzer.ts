import { fetchUserPlaylists, fetchPlaylistTracks } from './tidal';
import type { UserSettings } from '../types';

interface PlaylistArtist {
    name: string;
    count: number;
    image?: string; // Try to grab one image from a track
}

export const analyzePlaylists = async (settings: UserSettings): Promise<PlaylistArtist[]> => {
    if (!settings.tidalToken || !settings.tidalUserId) {
        throw new Error("Missing Tidal configuration");
    }

    const playlists = await fetchUserPlaylists(settings.tidalUserId, settings.tidalToken);

    // Use a Map to aggregate counts
    const artistMap = new Map<string, PlaylistArtist>();

    // Fetch tracks for all playlists (in parallel with some concurrency limit ideally, but simple for now)
    // We'll process them in chunks or sequentially to avoid hitting rate limits if there are many.
    // For MVP, lets try fetching all.

    // Note: This could be slow if user has many playlists. 
    // Optimization: Maybe limit to first 10-20 playlists for now?
    const playlistsToAnalyze = playlists.slice(0, 20);

    const promises = playlistsToAnalyze.map(async (playlist: any) => {
        const items = await fetchPlaylistTracks(playlist.uuid, settings.tidalToken!);

        items.forEach((item: any) => {
            // Tidal structure: item.item.artist.name or item.item.artists[0].name
            // Or sometimes item.item might be the track directly depending on endpoint?
            // The endpoint /playlists/:id/items returns items having a 'item' property which is the track/video.

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
                        // Only set image if we don't have one and current track has one? 
                        // Tidal artists from tracks might not have direct image links in this response, 
                        // usually we get artist ID. We might need to fetch artist info or just use a placeholder.
                        // For now, let's leave image empty or try to use album cover if artist image missing?
                    });
                }
            });
        });
    });

    await Promise.all(promises);

    // Convert map to array and sort
    const sortedArtists = Array.from(artistMap.values()).sort((a, b) => b.count - a.count);

    return sortedArtists;
};
