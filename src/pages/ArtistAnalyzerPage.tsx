import React, { useEffect, useState } from 'react';
import { getCachedAnalysis, analyzeMusicTaste, saveAnalysis } from '../services/analyzer';
import { fetchArtistInfo } from '../services/lastfm';
import { getSettings } from '../services/settings';
import type { Artist, TimePeriod } from '../types';
import { Loader, Info, Disc } from 'lucide-react';

const ArtistAnalyzer: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('12month');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cached = getCachedAnalysis();
        if (cached) {
            setArtists(cached.topArtists);
        }
    }, []);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setError(null);
        try {
            const settings = getSettings();

            if (!settings.lastfmApiKey || !settings.lastfmUsername) {
                throw new Error("Please configure Last.fm API Key and Username in Settings.");
            }

            const result = await analyzeMusicTaste(settings, timePeriod);
            saveAnalysis(result);
            setArtists(result.topArtists);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setAnalyzing(false);
        }
    };

    const handleArtistClick = async (artist: Artist) => {
        setSelectedArtist(artist); // Show basic info first
        // Fetch full info
        const settings = getSettings();
        if (settings.lastfmApiKey) {
            setLoading(true);
            try {
                const fullInfo = await fetchArtistInfo(artist.name, settings.lastfmApiKey);
                if (fullInfo) setSelectedArtist(fullInfo);
            } catch (e) {
                console.error("Failed to fetch details", e);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div style={{ display: 'flex', gap: 'var(--space-8)', height: 'calc(100vh - 100px)' }}>
            {/* List Analysis Pane */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                    <h1>Your Top Artists</h1>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                            className="input"
                            style={{ width: 'auto' }}
                            disabled={analyzing}
                        >
                            <option value="overall">All Time</option>
                            <option value="7day">Last 7 Days</option>
                            <option value="1month">Last Month</option>
                            <option value="3month">Last 3 Months</option>
                            <option value="6month">Last 6 Months</option>
                            <option value="12month">Last Year</option>
                        </select>
                        <button
                            className="btn btn-primary"
                            onClick={handleAnalyze}
                            disabled={analyzing}
                        >
                            {analyzing ? <Loader className="spin" size={20} /> : <Disc size={20} />}
                            {analyzing ? 'Analyzing...' : 'Run Analysis'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{
                        padding: 'var(--space-4)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                        color: 'var(--color-error)'
                    }}>
                        {error}
                    </div>
                )}

                {artists.length === 0 && !analyzing ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <p style={{ color: 'var(--color-text-muted)' }}>No analysis data found.</p>
                        <button className="btn btn-secondary" onClick={handleAnalyze}>Start Analysis</button>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 'var(--space-4)',
                        overflowY: 'auto',
                        paddingRight: 'var(--space-2)'
                    }}>
                        {artists.map((artist, idx) => (
                            <div
                                key={idx}
                                className="card"
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-4)',
                                    padding: 'var(--space-4)',
                                    borderColor: selectedArtist?.name === artist.name ? 'var(--color-accent)' : undefined,
                                    backgroundColor: selectedArtist?.name === artist.name ? 'var(--color-bg-hover)' : undefined
                                }}
                                onClick={() => handleArtistClick(artist)}
                            >
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    background: 'var(--color-bg-secondary)',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                    {/* Last.fm often returns empty images in free tier or specific responses, handle graceful fallback */}
                                    {artist.image[2] ? (
                                        <img src={artist.image[2]} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>?</div>
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>{artist.name}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                        {artist.playcount ? `${artist.playcount} plays` : 'Top Artist'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Pane */}
            <div style={{
                width: '400px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                overflowY: 'auto'
            }}>
                {selectedArtist ? (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                margin: '0 auto var(--space-4)',
                                border: '4px solid var(--color-bg-card)'
                            }}>
                                {selectedArtist.image[3] ? (
                                    <img src={selectedArtist.image[3]} alt={selectedArtist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'var(--color-bg-card)' }} />
                                )}
                            </div>
                            <h2>{selectedArtist.name}</h2>
                            <a
                                href={selectedArtist.url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1) var(--space-2)' }}
                            >
                                View on Last.fm
                            </a>
                        </div>

                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h4 style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 'var(--font-size-sm)', letterSpacing: '1px' }}>About</h4>
                            {loading ? (
                                <div style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                                    <Loader className="spin" size={16} /> Loading details...
                                </div>
                            ) : (
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {selectedArtist.bio?.summary?.replace(/<[^>]*>/g, '') || "No details available."}
                                </p>
                            )}
                        </div>

                        {selectedArtist.similar && selectedArtist.similar.length > 0 && (
                            <div>
                                <h4 style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 'var(--font-size-sm)', letterSpacing: '1px' }}>Similar Artists</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                    {selectedArtist.similar.map((sim, i) => (
                                        <span key={i} style={{
                                            backgroundColor: 'var(--color-bg-card)',
                                            padding: 'var(--space-1) var(--space-2)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}>
                                            {sim.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                        <Info size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
                        <p>Select an artist to view details.</p>
                    </div>
                )}
            </div>

            <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default ArtistAnalyzer;
