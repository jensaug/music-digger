import type { Artist, LastFmArtistBasic, LastFmArtistFull, LastFmImage, TimePeriod } from '../types';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

interface LastFmParams {
    method: string;
    [key: string]: string | undefined;
}

const getParams = (params: LastFmParams, apiKey: string) => {
    const searchParams = new URLSearchParams();
    searchParams.append('api_key', apiKey);
    searchParams.append('format', 'json');
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
    });
    return searchParams;
};

export const fetchTopArtists = async (username: string, apiKey: string, period: TimePeriod = 'overall', limit = 50): Promise<Artist[]> => {
    if (!username || !apiKey) return [];

    const params = getParams({
        method: 'user.gettopartists',
        user: username,
        period,
        limit: limit.toString()
    }, apiKey);

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.error) throw new Error(data.message);

    return data.topartists.artist.map((artist: LastFmArtistBasic) => ({
        name: artist.name,
        mbid: artist.mbid,
        url: artist.url,
        image: artist.image.map((img: LastFmImage) => img['#text']),
        playcount: artist.playcount,
        listeners: artist.listeners,
    }));
};

export const fetchArtistInfo = async (artistName: string, apiKey: string): Promise<Artist | null> => {
    if (!apiKey) return null;

    const params = getParams({
        method: 'artist.getinfo',
        artist: artistName,
        autocorrect: '1'
    }, apiKey);

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.error) return null;

    const artist = data.artist as LastFmArtistFull;
    return {
        name: artist.name,
        mbid: artist.mbid,
        url: artist.url,
        image: artist.image.map((img: LastFmImage) => img['#text']),
        bio: {
            summary: artist.bio.summary,
            content: artist.bio.content
        },
        similar: artist.similar.artist.map((sim: LastFmArtistBasic) => ({
            name: sim.name,
            url: sim.url,
            image: sim.image.map((img: LastFmImage) => img['#text'])
        })),
        tags: artist.tags.tag.map((t: { name: string }) => t.name)
    };
};
