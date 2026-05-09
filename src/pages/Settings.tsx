import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, ensureValidToken } from '../services/settings';
import { getAuthorizationUrl, exchangeCodeForTokens, fetchUserId } from '../services/tidal-oauth';
import { isTokenExpired } from '../services/tidal-oauth';
import { Loader, Check, X, ExternalLink } from 'lucide-react';

const Settings: React.FC = () => {
    const [username, setUsername] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [exchanging, setExchanging] = useState(false);
    const [checkingToken, setCheckingToken] = useState(false);
    const [tokenStatus, setTokenStatus] = useState<'valid' | 'expired' | 'none'>('none');
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const current = getSettings();
        setUsername(current.lastfmUsername);
        setApiKey(current.lastfmApiKey);
        if (current.tidalOAuth) {
            setClientId(current.tidalOAuth.clientId);
            setClientSecret(current.tidalOAuth.clientSecret);
            if (current.tidalOAuth.accessToken) {
                setConnected(true);
                setTokenStatus(isTokenExpired(current.tidalOAuth) ? 'expired' : 'valid');
            }
        }
    }, []);

    const handleAuthorize = async () => {
        if (!clientId) {
            alert("Please enter your Tidal Client ID first.");
            return;
        }
        const redirectUri = window.location.origin + window.location.pathname;
        try {
            const url = await getAuthorizationUrl(clientId, redirectUri);
            console.log('[Settings] Opening Tidal authorization page');
            window.open(url, '_blank');
        } catch (err) {
            console.error('[Settings] Failed to generate authorization URL:', err);
            alert(`Failed to generate authorization URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handleExchangeCode = async () => {
        if (!authCode.trim()) {
            alert("Please paste the authorization code from the URL.");
            return;
        }
        if (!clientId || !clientSecret) {
            alert("Please enter your Client ID and Client Secret.");
            return;
        }

        setExchanging(true);
        try {
            const redirectUri = window.location.origin + window.location.pathname;
            console.log('[Settings] Token exchange - redirect URI:', redirectUri);
            const oauthSettings = await exchangeCodeForTokens(authCode.trim(), clientId, clientSecret, redirectUri);
            
            const userId = await fetchUserId(oauthSettings.accessToken!);
            if (userId) {
                oauthSettings.userId = userId;
            }

            const current = getSettings();
            current.tidalOAuth = oauthSettings;
            current.lastfmUsername = username;
            current.lastfmApiKey = apiKey;
            saveSettings(current);

            setConnected(true);
            setTokenStatus('valid');
            setAuthCode('');
            alert('Successfully connected to Tidal!');
        } catch (err: unknown) {
            console.error('[Settings] Failed to connect to Tidal:', err);
            if (err instanceof Error) {
                alert(`Failed to exchange code: ${err.message}`);
            } else {
                alert('An unknown error occurred');
            }
        } finally {
            setExchanging(false);
        }
    };

    const handleRefreshToken = async () => {
        setCheckingToken(true);
        try {
            const current = getSettings();
            await ensureValidToken(current);
            setTokenStatus('valid');
            alert('Token refreshed successfully!');
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Refresh failed: ${err.message}`);
            }
        } finally {
            setCheckingToken(false);
        }
    };

    const handleDisconnect = () => {
        const current = getSettings();
        if (current.tidalOAuth) {
            current.tidalOAuth = {
                clientId: current.tidalOAuth.clientId,
                clientSecret: current.tidalOAuth.clientSecret
            };
        }
        saveSettings(current);
        setConnected(false);
        setTokenStatus('none');
        alert('Disconnected from Tidal.');
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveSettings({
            lastfmUsername: username,
            lastfmApiKey: apiKey,
            tidalOAuth: connected ? getSettings().tidalOAuth : { clientId, clientSecret }
        });
        alert('Settings saved!');
    };

    const checkUrlForCode = () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            setAuthCode(code);
            window.history.replaceState({}, '', window.location.pathname);
        }
    };

    useEffect(() => {
        checkUrlForCode();
    }, []);

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
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Tidal OAuth Configuration</h3>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                Client ID
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Tidal Client ID"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                disabled={connected}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                Client Secret
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Tidal Client Secret"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                disabled={connected}
                            />
                        </div>

                        {!connected ? (
                            <>
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleAuthorize}
                                        disabled={!clientId}
                                        style={{ width: '100%' }}
                                    >
                                        <ExternalLink size={16} />
                                        1. Authorize with Tidal
                                    </button>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                                        Opens Tidal login in a new tab. After authorizing, you'll be redirected back with a code.
                                    </p>
                                </div>

                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                                        Authorization Code
                                    </label>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Paste code from redirect URL"
                                            value={authCode}
                                            onChange={(e) => setAuthCode(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleExchangeCode}
                                            disabled={exchanging || !authCode}
                                        >
                                            {exchanging ? <Loader className="spin" size={16} /> : '2. Connect'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{
                                padding: 'var(--space-4)',
                                backgroundColor: tokenStatus === 'valid' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${tokenStatus === 'valid' ? 'var(--color-success)' : 'var(--color-error)'}`,
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-4)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                    {tokenStatus === 'valid' ? <Check size={18} color="var(--color-success)" /> : <X size={18} color="var(--color-error)" />}
                                    <strong style={{ color: tokenStatus === 'valid' ? 'var(--color-success)' : 'var(--color-error)' }}>
                                        {tokenStatus === 'valid' ? 'Connected' : 'Token Expired'}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                    {tokenStatus !== 'valid' && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleRefreshToken}
                                            disabled={checkingToken}
                                        >
                                            {checkingToken ? <Loader className="spin" size={14} /> : null}
                                            Refresh Token
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleDisconnect}
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Save Settings
                    </button>
                </form>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Settings;
