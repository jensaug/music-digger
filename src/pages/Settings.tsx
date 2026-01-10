import React, { useState, useEffect } from 'react';
import { fetchTidalUserId } from '../services/tidal';
import { getSettings, saveSettings } from '../services/settings';
import { Loader } from 'lucide-react';

const Settings: React.FC = () => {
    const [username, setUsername] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [tidalToken, setTidalToken] = useState('');
    const [tidalUserId, setTidalUserId] = useState('');
    const [checkingTidal, setCheckingTidal] = useState(false);

    useEffect(() => {
        const current = getSettings();
        setUsername(current.lastfmUsername);
        setApiKey(current.lastfmApiKey);
        setTidalToken(current.tidalToken || '');
        setTidalUserId(current.tidalUserId || '');
    }, []);

    const checkTidalId = async () => {
        if (!tidalToken) {
            alert("Please enter a Tidal Token first.");
            return;
        }
        setCheckingTidal(true);
        try {
            const id = await fetchTidalUserId(tidalToken);
            if (id) {
                setTidalUserId(id);
                alert(`Found User ID: ${id}`);
            } else {
                alert("Could not retrieve User ID. Please check your token or enter ID manually.");
            }
        } catch (e) {
            alert("Error checking Tidal ID");
        } finally {
            setCheckingTidal(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveSettings({
            lastfmUsername: username,
            lastfmApiKey: apiKey,
            tidalToken,
            tidalUserId
        });
        alert('Settings saved!');
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h1>Settings</h1>

            <div className="card">
                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Last.fm Configuration</h3>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                Username
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="your_username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                API Key
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Last.fm API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                                You can get an API key from <a href="https://www.last.fm/api/account/create" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>Last.fm API account creation</a>.
                            </p>
                        </div>
                    </div>

                    <div style={{ marginBottom: 'var(--space-6)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--space-6)' }}>
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Tidal Configuration</h3>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                Access Token (Optional)
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Tidal Access Token"
                                value={tidalToken}
                                onChange={(e) => setTidalToken(e.target.value)}
                            />
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                                Tidal API access is restricted. If you have a token, enter it here.
                            </p>
                        </div>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                User ID (Optional)
                            </label>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. 12345678 (Not email)"
                                    value={tidalUserId}
                                    onChange={(e) => setTidalUserId(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={checkTidalId}
                                    disabled={checkingTidal || !tidalToken}
                                >
                                    {checkingTidal ? <Loader className="spin" size={16} /> : 'Find ID'}
                                </button>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                                This must be your numeric Tidal User ID. Use 'Find ID' to try fetching it with your token.
                            </p>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Save Settings
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Settings;
