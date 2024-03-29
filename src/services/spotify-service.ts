import axios from 'axios';
import Service from './service';
import ServiceContainer from './service-container';

/**
 * Spotify service class.
 * 
 * This service is used to fetch the Spotify API.
 */
export default class SpotifyService extends Service {

  /**
   * Creates a new Spotify service.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container);
  }

  /**
   * Get the token's target user.
   * 
   * @param token Token of the targeted user
   * @returns Token's target user
   */
   public async getOwnUser(token: string): Promise<UserData> {
    const data = await this.fetch<UserResponse>(this.container.config.services.spotify.endpoints.ownUser, token);
    return data;
  }

  /**
   * Get the TOP artists of the token's target user.
   * 
   * @param token Token of the targeted user
   * @param limit Limit
   * @returns TOP artists of the token's target user
   */
  public async getOwnTopArtists(token: string, limit: number = 10): Promise<ArtistData[]> {
    const data = await this.fetch<TopArtistsResponse>(`${this.container.config.services.spotify.endpoints.ownTopArtists}?limit=${limit}`, token);
    return data.items;
  }

  /**
   * Get the TOP tracks of the token's target user.
   * 
   * @param token Token of the targeted user
   * @param limit Limit
   * @returns TOP tracks of the token's target user
   */
  public async getOwnTopTracks(token: string, limit: number = 10): Promise<TrackData[]> {
    const data = await this.fetch<TopTracksResponse>(`${this.container.config.services.spotify.endpoints.ownTopTracks}?limit=${limit}`, token);
    return data.items;
  }

  /**
   * Get playlists of the token's target user.
   * 
   * @param token Token of the targeted user
   * @param limit Limit
   * @returns Playlists of the token's target user
   */
  public async getOwnPlaylists(token: string, limit: number = 10): Promise<PlaylistData[]> {
    const data = await this.fetch<PlaylistsResponse>(`${this.container.config.services.spotify.endpoints.ownPlaylists}?limit=${limit}`, token);
    return data.items;
  }

  /**
   * Get an user.
   * 
   * @param token Token of the fetcher
   * @param userId User ID
   * @returns User
   */
   public async getUser(token: string, userId: string): Promise<UserData> {
    const data = await this.fetch<UserResponse>(`${this.container.config.services.spotify.endpoints.users}/${userId}`, token);
    return data;
  }

  /**
   * Get tracks.
   * 
   * @param token Token of the fetcher
   * @param trackIds Tracks IDs
   * @returns Tracks
   */
   public async getTracks(token: string, ...trackIds: string[]): Promise<TrackData[]> {
    const data = await this.fetch<TracksResponse>(`${this.container.config.services.spotify.endpoints.tracks}?ids=${trackIds.join('%2C')}`, token);
    return data.tracks;
  }

  /**
   * Fetches the Spotify API.
   * 
   * @param endpoint Endpoint
   * @param token Token of the targeted user
   * @returns Fetched data
   */
  private async fetch<R extends Response>(endpoint: string, token?: string): Promise<R> {
    const { apiUrl } = this.container.config.services.spotify;
    this.logger.info('Fetching data from Spotify API :', `${apiUrl}${endpoint}`, 'with token :', token);
    const res = await axios.get<R>(`${apiUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return res.data;
  }
}

/**
 * Spotify response interface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Response {}

/**
 * Spotify user response interface.
 */
export interface UserResponse extends Response, UserData {}

/**
 * Spotify playlists response interface.
 */
export interface PlaylistsResponse extends Response {
  items: PlaylistData[];
}

/**
 * Spotify tracks response interface.
 */
export interface TracksResponse extends Response {
  tracks: TrackData[];
}

/**
 * Spotify TOP artists response interface.
 */
 export interface TopArtistsResponse extends Response {
  items: ArtistData[];
}

/**
 * Spotify TOP tracks response interface.
 */
export interface TopTracksResponse extends Response {
  items: TrackData[];
}

/**
 * Spotify user data interface.
 */
export interface UserData {
  id: string;
  href: string;
  email: string;
  display_name: string;
  country: string;
  followers: {
    total: number;
  };
  images: [{
    url: string;
    width: number;
    height: number;
  }];
  external_urls: {
    spotify: string;
  };
}

/**
 * Spotify artist data interface.
 */
export interface ArtistData {
  href: string;
  name: string;
  genres: string[];
  followers: {
    total: number;
  };
  images: [{
    url: string;
    width: number;
    height: number;
  }];
  external_urls: {
    spotify: string;
  };
}

/**
 * Spotify track data interface.
 */
export interface TrackData {
  href: string;
  name: string;
  artists: [{
    name: string;
  }];
  album: {
    name: string;
    images: [{
      url: string;
      width: number;
      height: number;
    }];
    release_date: string;
  };
  external_urls: {
    spotify: string;
  };
}

/**
 * Spotify playlist data interface.
 */
export interface PlaylistData {
  id: string;
  href: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  owner: {
    id: string;
    display_name: string;
    href: string;
  };
  tracks: {
    href: string;
    total: number;
  };
  images: [{
    url: string;
    width: number;
    height: number;
  }];
  external_urls: {
    spotify: string;
  };
}
