export type Category = 'genre' | 'mood' | 'theme';

export interface SongResult {
  title: string;
  lyrics: {
    english: string;
    korean: string;
  };
  prompt: string;
  appliedKeywords: string[];
  randomKeywords?: string[];
}

export interface CategoryItem {
  id: string;
  label: string;
  description: string;
}
