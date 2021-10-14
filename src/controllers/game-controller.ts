import { Request, Response } from 'express';
import { PlayerAttributes } from '../models/game-model';
import ServiceContainer from '../services/service-container';
import Controller, { Link } from './controller';
import { Error as MongooseError } from 'mongoose';

/**
 * Games controller class.
 * 
 * Root path : `/games`
 */
export default class GameController extends Controller {

  /**
   * Creates a new games controller.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container, '/games');
    this.registerEndpoint({ method: 'GET', uri: '/', handlers: this.listHandler });
    this.registerEndpoint({ method: 'GET', uri: '/:id', handlers: this.getHandler });
    this.registerEndpoint({ method: 'POST', uri: '/', handlers: this.createHandler });
    this.registerEndpoint({ method: 'DELETE', uri: '/:id', handlers: this.deleteHandler });
  }

  /**
   * Lists all games.
   * 
   * Path : `GET /games`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async listHandler(req: Request, res: Response): Promise<Response> {
    try {
      return res.status(200).json({ games: await this.db.games.find() });
    } catch (err) {
      this.logger.error(err);
      return res.status(500).json(this.container.errors.formatServerError());
    }
  }

  /**
   * Gets a specific game.
   * 
   * Path : `GET /games/:id`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async getHandler(req: Request, res: Response): Promise<Response> {
    try {
      const game = await this.db.games.findById(req.params.id);
      if (game == null) {
        return res.status(404).json(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      return res.status(200).json({ game });
    } catch (err) {
      this.logger.error(err);
      return res.status(500).json(this.container.errors.formatServerError());
    }
  }

  /**
   * Creates a new game.
   * 
   * Path : `POST /games`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async createHandler(req: Request, res: Response): Promise<Response> {
    try {
      const author: PlayerAttributes = {
        author: true,
        name: req.body.author
      }
      const game = await this.db.games.create({
        players: [author]
      });
      res.setHeader('Location', `${req.protocol}://${req.get('host')}${this.rootUri}/${game.id}`);
      return res.status(201).send({
        id: game.id,
        code: game.code,
        token: await game.generateToken(game.players[0].id),
        links: [{
          rel: 'Gets the created game',
          action: 'GET',
          href: `${req.protocol}://${req.get('host')}${this.rootUri}/${game.id}`
        }] as Link[]
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof MongooseError.ValidationError) {
        return res.status(400).send(this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)));
      } else if (err instanceof Error) {
        return res.status(500).send(this.container.errors.formatServerError());
      }
    }
  }

  /**
   * Deletes a game.
   * 
   * Path : `DELETE /games/:id`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async deleteHandler(req: Request, res: Response): Promise<Response> {
    try {
      const game = await this.db.games.findByIdAndDelete(req.params.id);
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      return res.status(204).send();
    } catch (err) {
      this.logger.error(err);
      return res.status(500).json(this.container.errors.formatServerError());
    }
  }
}
