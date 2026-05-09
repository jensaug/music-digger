import { describe, it, expect, beforeAll } from 'vitest';

describe.skip('Tidal API Integration - Fetch All Playlists', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(() => {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available. Run with: npm run test:integration');
    }
    const settings = JSON.parse(localStorage.getItem('music-digger-settings') || '{}');
    accessToken = settings.tidalOAuth?.accessToken;
    userId = settings.tidalOAuth?.userId;

    if (!accessToken || !userId) {
      throw new Error('Tidal OAuth not configured. Please connect to Tidal in Settings first.');
    }
  });

  it('fetches ALL playlists with pagination', async () => {
    const BASE_URL = 'https://openapi.tidal.com/v2';
    const allPlaylists: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const url = `${BASE_URL}/users/${userId}/playlists?limit=${limit}&offset=${offset}`;
      console.log(`[Test] Fetching playlists offset=${offset}, limit=${limit}`);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      expect(response.ok, `Request failed with status ${response.status}`).toBe(true);

      const data = await response.json();
      const items = data.items || [];

      expect(Array.isArray(items), 'Response items should be an array').toBe(true);
      console.log(`[Test] Got ${items.length} playlists (total so far: ${allPlaylists.length + items.length})`);

      allPlaylists.push(...items);

      if (items.length < limit) {
        hasMore = false;
        console.log('[Test] Last page reached (fewer items than limit)');
      } else {
        offset += limit;
      }
    }

    console.log(`[Test] Total playlists fetched: ${allPlaylists.length}`);
    expect(allPlaylists.length, 'Should have fetched at least some playlists').toBeGreaterThan(0);

    if (allPlaylists.length > 0) {
      const firstPlaylist = allPlaylists[0];
      expect(firstPlaylist, 'Playlist should have uuid').toHaveProperty('uuid');
      expect(firstPlaylist, 'Playlist should have title').toHaveProperty('title');
      console.log(`[Test] First playlist: "${firstPlaylist.title}" (${firstPlaylist.uuid})`);
    }

    const uuids = new Set(allPlaylists.map(p => p.uuid));
    expect(uuids.size, 'All playlist UUIDs should be unique (no duplicates from pagination)').toBe(allPlaylists.length);
  });

  it('fetches all tracks from a playlist with pagination', async () => {
    const BASE_URL = 'https://openapi.tidal.com/v2';

    const playlistsResponse = await fetch(
      `${BASE_URL}/users/${userId}/playlists?limit=1`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const playlistsData = await playlistsResponse.json();
    const playlist = playlistsData.items?.[0];

    if (!playlist) {
      console.log('[Test] No playlists found, skipping track fetch test');
      return;
    }

    console.log(`[Test] Fetching all tracks for playlist: "${playlist.title}"`);

    const allTracks: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const url = `${BASE_URL}/playlists/${playlist.uuid}/items?limit=${limit}&offset=${offset}`;
      console.log(`[Test] Fetching tracks offset=${offset}, limit=${limit}`);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      expect(response.ok, `Track request failed with status ${response.status}`).toBe(true);

      const data = await response.json();
      const items = data.items || [];

      console.log(`[Test] Got ${items.length} tracks (total so far: ${allTracks.length + items.length})`);
      allTracks.push(...items);

      if (items.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`[Test] Total tracks in playlist: ${allTracks.length}`);

    if (allTracks.length > 0) {
      const trackWithArtists = allTracks.filter(item => item.item?.artists?.length > 0);
      console.log(`[Test] Tracks with artists: ${trackWithArtists.length}`);
      expect(trackWithArtists.length, 'Should have some tracks with artists').toBeGreaterThan(0);
    }
  });
});
