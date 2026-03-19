export type Category = 'genre' | 'mood' | 'theme';
export type LyricsLength = 'short' | 'normal' | 'long';
export type DrumStyle = 'none' | 'half-time' | 'double-time';

export interface SongResult {
  title: string;
  lyrics: {
    english: string;
    korean: string;
  };
  prompt: string;
  appliedKeywords: {
    genre: string[];
    mood: string[];
    theme: string[];
    tempo?: string;
  };
  randomKeywords?: string[];
}

export interface CategoryItem {
  id: string;
  label: string;
  description: string;
}
