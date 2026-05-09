import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TidalOAuthSettings } from '../src/types';

const createSuccessResponse = (data: any) =>
  ({ ok: true, json: async () => data } as Response);

const createErrorResponse = (error: string) =>
  ({ ok: false, json: async () => ({ error }) } as Response);

describe('tidal-oauth.ts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
        return arr;
      },
      subtle: { digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)) },
    });

    const storage = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('generates correct authorization URL with PKCE', async () => {
      const { getAuthorizationUrl } = await import('../src/services/tidal-oauth');
      const url = await getAuthorizationUrl('test_client_id', 'http://localhost:3000/callback');

      expect(url).toContain('https://login.tidal.com/authorize?');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('lang=en');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('code_challenge=');
    });

    it('includes all required scopes', async () => {
      const { getAuthorizationUrl } = await import('../src/services/tidal-oauth');
      const url = await getAuthorizationUrl('client123', 'http://example.com/callback');

      expect(url).toContain('scope=');
      expect(url).toContain('user.read');
      expect(url).toContain('collection.read');
      expect(url).toContain('search.read');
      expect(url).toContain('playlists.read');
      expect(url).toContain('entitlements.read');
      expect(url).toContain('recommendations.read');
      expect(url).toContain('playback');
    });

    it('stores code verifier in sessionStorage', async () => {
      const { getAuthorizationUrl } = await import('../src/services/tidal-oauth');
      await getAuthorizationUrl('client123', 'http://example.com/callback');

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'tidal-oauth-code-verifier',
        expect.any(String)
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('throws error when no code verifier', async () => {
      sessionStorage.getItem.mockReturnValue(null);
      const { exchangeCodeForTokens } = await import('../src/services/tidal-oauth');

      await expect(
        exchangeCodeForTokens('auth_code', 'client_id', 'client_secret', 'http://localhost/callback')
      ).rejects.toThrow('No code verifier found');
    });

    it('returns OAuth settings on success', async () => {
      sessionStorage.getItem.mockReturnValue('test_verifier');
      vi.mocked(fetch).mockResolvedValueOnce(
        createSuccessResponse({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
        })
      );

      const { exchangeCodeForTokens } = await import('../src/services/tidal-oauth');
      const result = await exchangeCodeForTokens(
        'auth_code_123',
        'client_id',
        'client_secret',
        'http://localhost/callback'
      );

      expect(result).toMatchObject({
        clientId: 'client_id',
        clientSecret: 'client_secret',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
      expect(result.userId).toBeUndefined();
      expect(result.expiresAt).toBeDefined();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('tidal-oauth-code-verifier');
    });

    it('sends code_verifier in token request', async () => {
      sessionStorage.getItem.mockReturnValue('my_test_verifier');
      vi.mocked(fetch).mockResolvedValueOnce(
        createSuccessResponse({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 })
      );

      const { exchangeCodeForTokens } = await import('../src/services/tidal-oauth');
      await exchangeCodeForTokens('code', 'id', 'secret', 'http://localhost/callback');

      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      expect(body).toContain('code_verifier=my_test_verifier');
      expect(body).toContain('grant_type=authorization_code');
    });

    it('throws error on invalid response', async () => {
      sessionStorage.getItem.mockReturnValue('verifier');
      vi.mocked(fetch).mockResolvedValueOnce(createErrorResponse('invalid_grant'));

      const { exchangeCodeForTokens } = await import('../src/services/tidal-oauth');

      await expect(
        exchangeCodeForTokens('invalid_code', 'client_id', 'client_secret', 'http://localhost/callback')
      ).rejects.toThrow('Token exchange failed: invalid_grant');
    });
  });

  describe('refreshAccessToken', () => {
    it('throws error when no refresh token', async () => {
      const { refreshAccessToken } = await import('../src/services/tidal-oauth');
      const settings: TidalOAuthSettings = {
        clientId: 'id',
        clientSecret: 'secret',
        accessToken: 'token',
        userId: '123',
      };

      await expect(refreshAccessToken(settings)).rejects.toThrow('No refresh token available');
    });

    it('returns updated settings on success', async () => {
      const settings: TidalOAuthSettings = {
        clientId: 'client_id',
        clientSecret: 'client_secret',
        accessToken: 'old_access_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() - 100000,
        userId: '12345',
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        createSuccessResponse({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 7200,
        })
      );

      const { refreshAccessToken } = await import('../src/services/tidal-oauth');
      const result = await refreshAccessToken(settings);

      expect(result).toMatchObject({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
      expect(result.expiresAt!).toBeGreaterThan(settings.expiresAt!);
    });

    it('falls back to original refreshToken if missing in response', async () => {
      const settings: TidalOAuthSettings = {
        clientId: 'client_id',
        clientSecret: 'client_secret',
        accessToken: 'access_token',
        refreshToken: 'original_refresh',
        expiresAt: Date.now() - 100000,
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        createSuccessResponse({ access_token: 'new_token', expires_in: 3600 })
      );

      const { refreshAccessToken } = await import('../src/services/tidal-oauth');
      const result = await refreshAccessToken(settings);

      expect(result.refreshToken).toBe('original_refresh');
    });

    it('throws error on invalid response', async () => {
      const settings: TidalOAuthSettings = {
        clientId: 'client_id',
        clientSecret: 'client_secret',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() - 100000,
      };

      vi.mocked(fetch).mockResolvedValueOnce(createErrorResponse('invalid_token'));

      const { refreshAccessToken } = await import('../src/services/tidal-oauth');

      await expect(refreshAccessToken(settings)).rejects.toThrow('Token refresh failed: invalid_token');
    });
  });

  describe('isTokenExpired', () => {
    it('returns true when expiresAt is missing', async () => {
      const { isTokenExpired } = await import('../src/services/tidal-oauth');
      const settings: TidalOAuthSettings = {
        clientId: 'id',
        clientSecret: 'secret',
        accessToken: 'token',
        refreshToken: 'refresh',
      };
      expect(isTokenExpired(settings)).toBe(true);
    });

    it('returns true when accessToken is missing', async () => {
      const { isTokenExpired } = await import('../src/services/tidal-oauth');
      const settings: TidalOAuthSettings = {
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 5000,
      };
      expect(isTokenExpired(settings)).toBe(true);
    });

    it('returns false when token is valid', async () => {
      const { isTokenExpired } = await import('../src/services/tidal-oauth');
      const settings: TidalOAuthSettings = {
        clientId: 'id',
        clientSecret: 'secret',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 180000,
      };
      expect(isTokenExpired(settings)).toBe(false);
    });

    it('returns true when token is expired', async () => {
      const { isTokenExpired } = await import('../src/services/tidal-oauth');
      const settings: TidalOAuthSettings = {
        clientId: 'id',
        clientSecret: 'secret',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 130000,
      };
      expect(isTokenExpired(settings)).toBe(true);
    });

    it('uses custom buffer when provided', async () => {
      const { isTokenExpired } = await import('../src/services/tidal-oauth');
      const settings: TidalOAuthSettings = {
        clientId: 'id',
        clientSecret: 'secret',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 150000,
      };
      expect(isTokenExpired(settings, 60000)).toBe(false);
      expect(isTokenExpired(settings, 200000)).toBe(true);
    });
  });

  describe('fetchUserId', () => {
    it('returns userId on success', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createSuccessResponse({ userId: '12345' }));

      const { fetchUserId } = await import('../src/services/tidal-oauth');

      expect(await fetchUserId('access_token')).toBe('12345');
    });

    it('returns null when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);

      const { fetchUserId } = await import('../src/services/tidal-oauth');

      expect(await fetchUserId('access_token')).toBe(null);
    });

    it('returns null when userId is missing', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createSuccessResponse({}));

      const { fetchUserId } = await import('../src/services/tidal-oauth');

      expect(await fetchUserId('access_token')).toBe(null);
    });

    it('returns null on network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { fetchUserId } = await import('../src/services/tidal-oauth');

      expect(await fetchUserId('access_token')).toBe(null);
    });
  });
});
