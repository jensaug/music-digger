import type { TidalOAuthSettings } from '../types';

const AUTH_BASE_URL = 'https://login.tidal.com';
const TOKEN_URL = `${AUTH_BASE_URL}/authorize`;

const CODE_VERIFIER_KEY = 'tidal-oauth-code-verifier';

function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

const normalizeRedirectUri = (uri: string): string => {
    try {
        const url = new URL(uri);
        return url.origin + (url.pathname.replace(/\/+$/, '') || '/');
    } catch {
        return uri;
    }
};

export const getAuthorizationUrl = async (clientId: string, redirectUri: string): Promise<string> => {
    const normalizedUri = normalizeRedirectUri(redirectUri);
    if (normalizedUri !== redirectUri) {
        console.warn('[Tidal OAuth] Redirect URI normalized:', redirectUri, '→', normalizedUri);
    }
    console.log('[Tidal OAuth] Authorization URL:', { clientId, redirectUri: normalizedUri });
    
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
    
    const params = new URLSearchParams({
        response_type: 'code',
        redirect_uri: redirectUri,
        client_id: clientId,
        scope: 'user.read collection.read search.read playlists.read entitlements.read recommendations.read playback',
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        lang: 'en'
    });
    
    const url = `${TOKEN_URL}?${params.toString()}`;
    console.log('[Tidal OAuth] Authorization URL generated:', url);
    return url;
};

export const exchangeCodeForTokens = async (
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
): Promise<TidalOAuthSettings> => {
    const normalizedUri = normalizeRedirectUri(redirectUri);
    if (normalizedUri !== redirectUri) {
        console.warn('[Tidal OAuth] Redirect URI normalized:', redirectUri, '→', normalizedUri);
    }
    console.log('[Tidal OAuth] Token exchange:', { clientId, redirectUri: normalizedUri, code: code.substring(0, 20) + '...' });
    
    const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
    if (!codeVerifier) {
        console.error('[Tidal OAuth] No code verifier in sessionStorage. Keys:', Object.keys(sessionStorage));
        throw new Error('No code verifier found. Please start the authorization flow again.');
    }
    
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: normalizedUri,
        client_id: clientId,
        code_verifier: codeVerifier,
    });

    console.log('[Tidal OAuth] Token endpoint: https://auth.tidal.com/v1/oauth2/token');

    const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    console.log('[Tidal OAuth] Token response status:', response.status);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Tidal OAuth] Token exchange failed:', JSON.stringify(error));
        throw new Error(`Token exchange failed: ${error.error || error.error_description || response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    sessionStorage.removeItem(CODE_VERIFIER_KEY);

    return {
        clientId,
        clientSecret,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        userId: undefined
    };
};

export const refreshAccessToken = async (
    settings: TidalOAuthSettings
): Promise<TidalOAuthSettings> => {
    if (!settings.refreshToken) {
        throw new Error('No refresh token available. Please re-authorize.');
    }

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: settings.refreshToken,
        client_id: settings.clientId,
    });

    const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Token refresh failed: ${error.error || error.error_description || response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    return {
        ...settings,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || settings.refreshToken,
        expiresAt
    };
};

export const isTokenExpired = (settings: TidalOAuthSettings, bufferMs: number = 120000): boolean => {
    if (!settings.expiresAt || !settings.accessToken) return true;
    return Date.now() >= (settings.expiresAt - bufferMs);
};

export const fetchUserId = async (accessToken: string): Promise<string | null> => {
    try {
        const response = await fetch('https://openapi.tidal.com/v1/sessions', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.userId ? data.userId.toString() : null;
    } catch {
        return null;
    }
};
