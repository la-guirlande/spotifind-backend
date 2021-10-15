import axios from 'axios';
import { Request, Response } from 'express';
import ServiceContainer from '../services/service-container';
import { UserResponse } from '../services/spotify-service';
import { AccessTokenData } from '../services/token-service';
import Controller from './controller';

/**
 * Authentication controller class.
 * 
 * Root path : `/auth`
 */
export default class AuthenticationController extends Controller {

  /**
   * Creates a new authentication controller.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container, '/auth');
    this.registerEndpoint({ method: 'POST', uri: '/accessToken', handlers: this.accessToken });
  }

  /**
   * Gets a new access token with a Spotify access token.
   * 
   * Path: `POST /accessToken`
   * 
   * @param req Express request
   * @param res Express response
   */
  public async accessToken(req: Request, res: Response): Promise<Response> {
    try {
      const response = await axios.get<UserResponse>('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${req.body.spotify_access_token}` } });
      switch (response.status) {
        case 200:
          const user = await this.container.auth.createAccountIfNotExists(response.data);
          const accessToken = await this.container.tokens.encode<AccessTokenData>({ userId: user.id }, process.env.ACCESS_TOKEN_KEY);
          return res.status(200).json({ access_token: accessToken });
        default:
          return res.status(403).json(this.container.errors.formatErrors({
            error: 'access_denied',
            error_description: 'Invalid Spotify access token'
          }));
      }
    } catch (err) {
      this.logger.error(err);
      return res.status(500).json(this.container.errors.formatServerError());
    }
  }
}
