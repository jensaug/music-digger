export interface Artist {
  name: string;
  mbid?: string;
  url: string;
  image: string[]; // Last.fm returns array of images
  listeners?: string;
  playcount?: string;
  bio?: {
    summary: string;
    content: string;
  };
  similar?: Artist[];
  tags?: string[];
}

export interface Track {
  name: string;
  artist: string | Artist;
  album?: string;
  url: string;
  image?: string[];
  date?: {
    uts: string;
    '#text': string;
  };
}

export interface UserSettings {
  lastfmUsername: string;
  lastfmApiKey: string;
  tidalToken?: string;
  tidalUserId?: string;
}

export interface AnalysisResult {
  topArtists: Artist[];
  recentTracks: Track[];
  analyzedAt: number;
}

export type TimePeriod = 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';

// Raw Last.fm API types
export interface LastFmImage {
  '#text': string;
  size: string;
}

export interface LastFmArtistBasic {
  name: string;
  mbid?: string;
  url: string;
  image: LastFmImage[];
  playcount?: string;
  listeners?: string;
}

export interface LastFmArtistFull extends LastFmArtistBasic {
  bio: {
    summary: string;
    content: string;
  };
  similar: {
    artist: LastFmArtistBasic[];
  };
  tags: {
    tag: { name: string }[];
  };
}
