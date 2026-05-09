import React, { useState } from 'react';
import { analyzePlaylists } from '../services/playlistAnalyzer';
import { getSettings } from '../services/settings';
import { Loader, Disc, Music } from 'lucide-react';

interface PlaylistArtist {
    name: string;
    count: number;
    image?: string;
}

const PlaylistAnalyzer: React.FC = () => {
    const [artists, setArtists] = useState<PlaylistArtist[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const settings = getSettings();

            if (!settings.tidalOAuth?.clientId || !settings.tidalOAuth?.clientSecret) {
                throw new Error("Please configure Tidal OAuth in Settings.");
            }

            if (!settings.tidalOAuth.accessToken || !settings.tidalOAuth.refreshToken) {
                throw new Error("Please connect to Tidal first in Settings.");
            }

            const results = await analyzePlaylists(settings);
            setArtists(results);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1>Playlist Analyzer</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Analyze your Tidal playlists to find your most collected artists.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleAnalyze}
                    disabled={loading}
                >
                    {loading ? <Loader className="spin" size={20} /> : <Disc size={20} />}
                    {loading ? 'Scanning Playlists...' : 'Analyze Playlists'}
                </button>
            </div>

            {error && (
                <div style={{
                    padding: 'var(--space-4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-6)',
                    color: 'var(--color-error)'
                }}>
                    {error}
                </div>
            )}

            {artists.length === 0 && !loading && !error ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                    <Music size={64} style={{ opacity: 0.2, marginBottom: 'var(--space-4)' }} />
                    <p>Click "Analyze Playlists" to start scanning your library.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 'var(--space-4)'
                }}>
                    {artists.map((artist, idx) => (
                        <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--color-bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-muted)',
                                fontWeight: 'bold'
                            }}>
                                {idx + 1}
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{artist.name}</div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                    {artist.count} tracks
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default PlaylistAnalyzer;
