const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type ImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original';

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
  still_path: string | null;
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
  vote_average: number;
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
  vote_average: number;
  genres: { id: number; name: string }[];
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  return tmdbFetch<MovieDetails>(`/movie/${id}`);
}

// --- Trending ---

export interface TrendingItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
}

interface RawTrendingResult {
  id: number;
  name?: string;
  title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
}

function normalizeTrending(item: RawTrendingResult, mediaType: MediaType): TrendingItem {
  return {
    id: item.id,
    title: (mediaType === 'tv' ? item.name : item.title) ?? 'Untitled',
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    overview: item.overview,
    vote_average: item.vote_average,
  };
}

export async function getTrending(): Promise<{ shows: TrendingItem[]; movies: TrendingItem[] }> {
  const [tv, movies] = await Promise.all([
    tmdbFetch<{ results: RawTrendingResult[] }>('/trending/tv/week'),
    tmdbFetch<{ results: RawTrendingResult[] }>('/trending/movie/week'),
  ]);

  return {
    shows: tv.results.map((item) => normalizeTrending(item, 'tv')),
    movies: movies.results.map((item) => normalizeTrending(item, 'movie')),
  };
}

// --- Genres ---

export interface GenreOption {
  id: number;
  name: string;
  type: 'tv' | 'movie' | 'both';
}

export async function getGenreOptions(): Promise<GenreOption[]> {
  const [tv, movie] = await Promise.all([
    tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/tv/list'),
    tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),
  ]);

  const map = new Map<number, GenreOption>();
  for (const g of tv.genres) map.set(g.id, { ...g, type: 'tv' });
  for (const g of movie.genres) {
    const existing = map.get(g.id);
    map.set(g.id, existing ? { ...existing, type: 'both' } : { ...g, type: 'movie' });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// --- Discover / similar ---

export interface DiscoverItem {
  id: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  date: string;
  genreIds: number[];
  overview: string;
  popularity?: number;
}

interface RawDiscoverResult {
  id: number;
  name?: string;
  title?: string;
  first_air_date?: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genre_ids?: number[];
  overview: string;
  popularity?: number;
}

function normalizeDiscoverItem(item: RawDiscoverResult, type: MediaType): DiscoverItem {
  return {
    id: item.id,
    type,
    title: (type === 'tv' ? item.name : item.title) ?? 'Untitled',
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    voteAverage: item.vote_average ?? 0,
    date: (type === 'tv' ? item.first_air_date : item.release_date) ?? '',
    genreIds: item.genre_ids ?? [],
    overview: item.overview ?? '',
    popularity: item.popularity,
  };
}

export type DiscoverSort = 'popularity' | 'rating' | 'newest';
export type DiscoverType = 'all' | MediaType;

export interface DiscoverInput {
  query: string;
  type: DiscoverType;
  genres: number[];
  sort: DiscoverSort;
  page: number;
}

export interface DiscoverPage {
  items: DiscoverItem[];
  page: number;
  totalPages: number;
}

const sortMap = {
  tv: { popularity: 'popularity.desc', rating: 'vote_average.desc', newest: 'first_air_date.desc' },
  movie: { popularity: 'popularity.desc', rating: 'vote_average.desc', newest: 'primary_release_date.desc' },
} as const;

function sortDiscoverItems(items: DiscoverItem[], sort: DiscoverSort): DiscoverItem[] {
  const copy = [...items];
  if (sort === 'rating') copy.sort((a, b) => b.voteAverage - a.voteAverage);
  if (sort === 'newest') copy.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return copy;
}

export async function discoverTitles(input: DiscoverInput): Promise<DiscoverPage> {
  const page = Math.max(1, input.page || 1);
  const query = input.query.trim();
  const wantTv = input.type !== 'movie';
  const wantMovie = input.type !== 'tv';
  const genreParam = input.genres.join(',');

  if (query) {
    const results = await tmdbFetch<{ results: (RawDiscoverResult & { media_type?: string })[]; total_pages: number }>(
      '/search/multi',
      { query, page: String(page), include_adult: 'false' },
    );
    let items = results.results
      .filter((r) => (r.media_type === 'tv' && wantTv) || (r.media_type === 'movie' && wantMovie))
      .map((r) => normalizeDiscoverItem(r, r.media_type as MediaType));
    if (input.genres.length) items = items.filter((i) => input.genres.some((g) => i.genreIds.includes(g)));
    return { items: sortDiscoverItems(items, input.sort), page, totalPages: Math.min(results.total_pages ?? 1, 20) };
  }

  const requests: Promise<{ results: DiscoverItem[]; total_pages: number }>[] = [];
  if (wantTv) {
    requests.push(
      tmdbFetch<{ results: RawDiscoverResult[]; total_pages: number }>('/discover/tv', {
        page: String(page),
        sort_by: sortMap.tv[input.sort],
        ...(genreParam ? { with_genres: genreParam } : {}),
        'vote_count.gte': input.sort === 'rating' ? '300' : '0',
      }).then((r) => ({ results: r.results.map((item) => normalizeDiscoverItem(item, 'tv')), total_pages: r.total_pages })),
    );
  }
  if (wantMovie) {
    requests.push(
      tmdbFetch<{ results: RawDiscoverResult[]; total_pages: number }>('/discover/movie', {
        page: String(page),
        sort_by: sortMap.movie[input.sort],
        ...(genreParam ? { with_genres: genreParam } : {}),
        'vote_count.gte': input.sort === 'rating' ? '300' : '0',
      }).then((r) => ({ results: r.results.map((item) => normalizeDiscoverItem(item, 'movie')), total_pages: r.total_pages })),
    );
  }

  const settled = await Promise.all(requests);
  const merged = settled.flatMap((r) => r.results);
  const totalPages = Math.min(Math.max(...settled.map((r) => r.total_pages), 1), 20);
  return { items: sortDiscoverItems(merged, input.sort), page, totalPages };
}

export async function getSimilar(id: number, type: MediaType): Promise<DiscoverItem[]> {
  const path = type === 'tv' ? `/tv/${id}/similar` : `/movie/${id}/similar`;
  const res = await tmdbFetch<{ results: RawDiscoverResult[] }>(path);
  return res.results.map((item) => normalizeDiscoverItem(item, type));
}

export async function discoverByGenres(
  genreIds: number[],
  params: Record<string, string> = {},
): Promise<DiscoverItem[]> {
  const genreParam = genreIds.join(',');
  const [tv, movies] = await Promise.all([
    tmdbFetch<{ results: RawDiscoverResult[] }>('/discover/tv', { with_genres: genreParam, page: '1', ...params }),
    tmdbFetch<{ results: RawDiscoverResult[] }>('/discover/movie', { with_genres: genreParam, page: '1', ...params }),
  ]);
  return [...tv.results.map((item) => normalizeDiscoverItem(item, 'tv')), ...movies.results.map((item) => normalizeDiscoverItem(item, 'movie'))];
}
