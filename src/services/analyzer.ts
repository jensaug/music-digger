import { fetchTopArtists } from './lastfm';
import type { AnalysisResult, UserSettings, Track, TimePeriod } from '../types';

export const analyzeMusicTaste = async (settings: UserSettings, period: TimePeriod = '12month'): Promise<AnalysisResult> => {
    // In a real app, we would fetch from Tidal too and merge.
    // For now, we rely on Last.fm top artists.

    if (!settings.lastfmApiKey || !settings.lastfmUsername) {
        throw new Error("Missing Last.fm configuration");
    }

    const topArtists = await fetchTopArtists(settings.lastfmUsername, settings.lastfmApiKey, period);

    // Mock recent tracks for now or fetch if implemented
    const recentTracks: Track[] = [];

    return {
        topArtists,
        recentTracks,
        analyzedAt: Date.now()
    };
};

export const getCachedAnalysis = (): AnalysisResult | null => {
    const cached = localStorage.getItem('music-digger-analysis');
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch (e) {
            console.error("Failed to parse cached analysis", e);
            return null;
        }
    }
    return null;
};

export const saveAnalysis = (result: AnalysisResult) => {
    localStorage.setItem('music-digger-analysis', JSON.stringify(result));
};
