import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createSettings = (
  overrides: Partial<{ lastfmUsername: string; lastfmApiKey: string; tidalOAuth: any }> = {}
) => ({
  lastfmUsername: overrides.lastfmUsername ?? 'testuser',
  lastfmApiKey: overrides.lastfmApiKey ?? 'testkey',
  tidalOAuth: overrides.tidalOAuth ?? {
    clientId: 'client_id',
    clientSecret: 'secret',
    accessToken: 'token',
    refreshToken: 'refresh',
    userId: '12345',
  },
  ...overrides,
});

const createTidalOAuthMock = (
  overrides: Partial<typeof import('../src/services/tidal-oauth')> = {}
) => ({
  isTokenExpired: vi.fn(),
  refreshAccessToken: vi.fn(),
  fetchUserId: vi.fn(),
  ...overrides,
});

describe('settings.ts', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('getSettings', () => {
    it('populates settings from localStorage', async () => {
      const stored = createSettings({ tidalOAuth: { clientId: 'tidal_client', clientSecret: 'tidal_secret' } });
      storage['music-digger-settings'] = JSON.stringify(stored);

      vi.doMock('../src/services/tidal-oauth');
      const { getSettings } = await import('../src/services/settings');

      expect(getSettings().lastfmUsername).toBe('testuser');
      expect(getSettings().lastfmApiKey).toBe('testkey');
      expect(getSettings().tidalOAuth?.clientId).toBe('tidal_client');
    });

    it('handles invalid JSON in localStorage gracefully', async () => {
      storage['music-digger-settings'] = 'not valid json';
      vi.doMock('../src/services/tidal-oauth');
      const { getSettings } = await import('../src/services/settings');

      expect(getSettings().lastfmUsername).toBeDefined();
      expect(getSettings().lastfmApiKey).toBeDefined();
    });
  });

  describe('saveSettings', () => {
    it('stores settings to localStorage as JSON', async () => {
      vi.doMock('../src/services/tidal-oauth');
      const { saveSettings } = await import('../src/services/settings');
      const settings = createSettings({ tidalOAuth: { clientId: 'tidal_client', clientSecret: 'tidal_secret' } });

      saveSettings(settings);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'music-digger-settings',
        JSON.stringify(settings)
      );
    });
  });

  describe('ensureValidToken', () => {
    it('throws error when clientId is missing', async () => {
      vi.doMock('../src/services/tidal-oauth', createTidalOAuthMock);
      const { ensureValidToken } = await import('../src/services/settings');

      await expect(
        ensureValidToken(createSettings({ tidalOAuth: { clientSecret: 'secret' } }))
      ).rejects.toThrow('Tidal OAuth not configured');
    });

    it('throws error when clientSecret is missing', async () => {
      vi.doMock('../src/services/tidal-oauth', createTidalOAuthMock);
      const { ensureValidToken } = await import('../src/services/settings');

      await expect(
        ensureValidToken(createSettings({ tidalOAuth: { clientId: 'client_id' } }))
      ).rejects.toThrow('Tidal OAuth not configured');
    });

    it('throws error when accessToken is missing', async () => {
      vi.doMock('../src/services/tidal-oauth', createTidalOAuthMock);
      const { ensureValidToken } = await import('../src/services/settings');

      await expect(
        ensureValidToken(createSettings({ tidalOAuth: { clientId: 'client_id', clientSecret: 'secret', refreshToken: 'refresh' } }))
      ).rejects.toThrow('Not connected to Tidal');
    });

    it('throws error when refreshToken is missing', async () => {
      vi.doMock('../src/services/tidal-oauth', createTidalOAuthMock);
      const { ensureValidToken } = await import('../src/services/settings');

      await expect(
        ensureValidToken(createSettings({ tidalOAuth: { clientId: 'client_id', clientSecret: 'secret', accessToken: 'access' } }))
      ).rejects.toThrow('Not connected to Tidal');
    });

    it('refreshes expired token', async () => {
      const mockRefreshAccessToken = vi.fn(() =>
        Promise.resolve({
          clientId: 'client_id',
          clientSecret: 'secret',
          accessToken: 'new_token',
          refreshToken: 'new_refresh',
          expiresAt: Date.now() + 3600000,
          userId: '12345',
        })
      );

      vi.doMock('../src/services/tidal-oauth', () =>
        createTidalOAuthMock({
          isTokenExpired: vi.fn(() => true),
          refreshAccessToken: mockRefreshAccessToken,
        })
      );

      const { ensureValidToken } = await import('../src/services/settings');
      const tidalOAuth = await import('../src/services/tidal-oauth');

      const result = await ensureValidToken(
        createSettings({
          tidalOAuth: {
            clientId: 'client_id',
            clientSecret: 'secret',
            accessToken: 'expired_token',
            refreshToken: 'refresh_token',
            expiresAt: Date.now() - 100000,
            userId: '12345',
          },
        })
      );

      expect(tidalOAuth.refreshAccessToken).toHaveBeenCalled();
      expect(result.tidalOAuth?.accessToken).toBe('new_token');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('fetches userId after refresh if missing', async () => {
      const mockRefreshAccessToken = vi.fn(() =>
        Promise.resolve({
          clientId: 'client_id',
          clientSecret: 'secret',
          accessToken: 'new_token',
          refreshToken: 'new_refresh',
          expiresAt: Date.now() + 3600000,
        })
      );

      const mockFetchUserId = vi.fn(() => Promise.resolve('99999'));

      vi.doMock('../src/services/tidal-oauth', () =>
        createTidalOAuthMock({
          isTokenExpired: vi.fn(() => true),
          refreshAccessToken: mockRefreshAccessToken,
          fetchUserId: mockFetchUserId,
        })
      );

      const { ensureValidToken } = await import('../src/services/settings');
      const tidalOAuth = await import('../src/services/tidal-oauth');

      const result = await ensureValidToken(
        createSettings({
          tidalOAuth: {
            clientId: 'client_id',
            clientSecret: 'secret',
            accessToken: 'expired_token',
            refreshToken: 'refresh_token',
            expiresAt: Date.now() - 100000,
          },
        })
      );

      expect(tidalOAuth.fetchUserId).toHaveBeenCalledWith('new_token');
      expect(result.tidalOAuth?.userId).toBe('99999');
    });

    it('returns settings without refresh when token is valid', async () => {
      const mockRefreshAccessToken = vi.fn();

      vi.doMock('../src/services/tidal-oauth', () =>
        createTidalOAuthMock({
          isTokenExpired: vi.fn(() => false),
          refreshAccessToken: mockRefreshAccessToken,
        })
      );

      const { ensureValidToken } = await import('../src/services/settings');
      const tidalOAuth = await import('../src/services/tidal-oauth');

      const result = await ensureValidToken(
        createSettings({
          tidalOAuth: {
            clientId: 'client_id',
            clientSecret: 'secret',
            accessToken: 'valid_token',
            refreshToken: 'refresh_token',
            expiresAt: Date.now() + 3600000,
            userId: '12345',
          },
        })
      );

      expect(tidalOAuth.refreshAccessToken).not.toHaveBeenCalled();
      expect(result.tidalOAuth?.accessToken).toBe('valid_token');
    });
  });
});
