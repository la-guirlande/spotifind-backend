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
   * Get the TOP artists of the token's target user.
   * 
   * @param token Token of the targeted user
   * @param limit Limit
   * @returns TOP artists of the token's target user
   */
  public async topArtists(token: string, limit: number = 10): Promise<ArtistData[]> {
    const data = await this.fetch<TopArtistsResponse>(`${this.container.config.services.spotify.endpoints.topArtists}?limit=${limit}`, token);
    return data.items;
  }

  /**
   * Get the TOP tracks of the token's target user.
   * 
   * @param token Token of the targeted user
   * @param limit Limit
   * @returns TOP tracks of the token's target user
   */
  public async topTracks(token: string, limit: number = 10): Promise<TrackData[]> {
    const data = await this.fetch<TopTracksResponse>(`${this.container.config.services.spotify.endpoints.topTracks}?limit=${limit}`, token);
    return data.items;
  }

  /**
   * Fetches the Spotify API.
   * 
   * @param endpoint Endpoint
   * @param token Token of the targeted user
   * @returns Fetched data
   */
  private async fetch<R extends Response>(endpoint: string, token: string): Promise<R> {
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
 * Spotify artist data.
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
 * Spotify track data.
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
