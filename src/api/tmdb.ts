const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type ImageSize = 'w185' | 'w342' | 'w500' | 'original';

export function posterUrl(path: string | null, size: ImageSize = 'w342') {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function backdropUrl(path: string | null, size: ImageSize = 'w500') {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_TMDB_API_KEY. Add it to .env.local.');
  }

  const query = new URLSearchParams({ api_key: API_KEY, ...params });
  const response = await fetch(`${BASE_URL}${path}?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}): ${path}`);
  }

  return response.json() as Promise<T>;
}

export type MediaType = 'tv' | 'movie';

export interface SearchResultItem {
  id: number;
  media_type: MediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  overview: string;
}

interface RawMultiSearchResult {
  id: number;
  media_type: 'tv' | 'movie' | 'person';
  name?: string;
  title?: string;
  first_air_date?: string;
  release_date?: string;
  poster_path: string | null;
  overview: string;
}

function normalizeSearchResult(
  item: { id: number; name?: string; title?: string; first_air_date?: string; release_date?: string; poster_path: string | null; overview: string },
  mediaType: MediaType,
): SearchResultItem {
  const date = mediaType === 'tv' ? item.first_air_date : item.release_date;
  return {
    id: item.id,
    media_type: mediaType,
    title: (mediaType === 'tv' ? item.name : item.title) ?? 'Untitled',
    year: date ? date.slice(0, 4) : null,
    poster_path: item.poster_path,
    overview: item.overview,
  };
}

export async function searchMulti(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) return [];

  const data = await tmdbFetch<{ results: RawMultiSearchResult[] }>('/search/multi', {
    query,
    include_adult: 'false',
  });

  return data.results
    .filter((item): item is RawMultiSearchResult & { media_type: MediaType } => item.media_type !== 'person')
    .map((item) => normalizeSearchResult(item, item.media_type));
}

interface RawMovieSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview: string;
}

export async function searchMovies(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) return [];

  const data = await tmdbFetch<{ results: RawMovieSearchResult[] }>('/search/movie', {
    query,
    include_adult: 'false',
  });

  return data.results.map((item) => normalizeSearchResult(item, 'movie'));
}

interface RawTvSearchResult {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
}

export async function searchTv(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) return [];

  const data = await tmdbFetch<{ results: RawTvSearchResult[] }>('/search/tv', {
    query,
    include_adult: 'false',
  });

  return data.results.map((item) => normalizeSearchResult(item, 'tv'));
}

export interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  air_date: string | null;
  overview: string;
  runtime: number | null;
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TvDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  genres: { id: number; name: string }[];
  seasons: Season[];
}

export async function getTvDetails(id: number): Promise<TvDetails> {
  return tmdbFetch<TvDetails>(`/tv/${id}`);
}

export interface SeasonDetails {
  id: number;
  season_number: number;
  name: string;
  episodes: Episode[];
}

export async function getSeasonDetails(tvId: number, seasonNumber: number): Promise<SeasonDetails> {
  return tmdbFetch<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

export interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  return tmdbFetch<MovieDetails>(`/movie/${id}`);
}
