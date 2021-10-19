import _ from 'lodash';
import { Error as MongooseError } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { GameInstance, PlayerAttributes, Status } from '../models/game-model';
import { APIErrorResponse } from './error-service';
import Service from './service';
import ServiceContainer from './service-container';
import { GameTokenData } from './token-service';

/**
 * Websocket service class.
 * 
 * This service is used to manage the websocket server.
 * 
 * Webocket workflow :
 *  - Game registration :
 *    - The author creates a new game, gets game code and player token (API)
 *    - A player joins game with the code and gets player token (`JOIN` event)
 *  - Game connection :
 *    - With game code and player token, players (and the author) connects their websocket to the game room (`CONNECT` event)
 */
export default class WebsocketService extends Service {

  private srv: Server;

  /**
   * Creates a new websocket service.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container);
    this.srv = null;
  }

  /**
   * Starts the websocket server.
   * 
   * @param port Listening port
   */
  public start(port: number = 8000): void {
    if (!this.srv) {
      this.srv = new Server(port, {
          pingInterval: 60000,
          pingTimeout: 600000,
          cors: {
            origin: '*'
          }
      });
      this.createEvents();
    }
  }

  /**
   * Stops the websocket server.
   */
  public stop(): void {
    if (this.srv) {
      this.srv.close();
      this.srv = null;
    }
  }

  /**
   * Creates events.
   */
  private createEvents(): void {
    this.srv.on('connect', (socket: Socket) => {
      this.logger.info(`Websocket connected : ${socket.handshake.address}`);

      // When the socket disconnects
      socket.on('disconnect', () => {
          socket.rooms.forEach(socket.leave);
          this.logger.info(`Websocket disconnected : ${socket.handshake.address}`);
      });

      // Used for testing websocket connection between server and client (dev only)
      if (this.container.env.nodeEnv === 'development') {
        socket.on(EventType.TEST, (data: TestClientToServerEvent) => {
          this.logger.debug('Websocket test received with data :', data);
          return socket.emit(EventType.TEST, { status: 'OK', data } as TestServerToClientEvent);
        });
      }

      // When the socket wants to join a game
      socket.on(EventType.JOIN, async (data: JoinClientToServerEvent) => {
        try {
          const game = await this.db.games.findOne().where('code').equals(data.code);
          if (game == null) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'not_found', error_description: 'Invalid code' }) as ErrorEvent);
          }
          if (game.status !== Status.INIT) {
            let error_description;
            switch (game.status) {
              case Status.IN_PROGRESS:
                error_description = 'Game in progress';
                break;
              case Status.FINISHED:
                error_description = 'Game finished';
                break;
              default:
                error_description: 'Game not accessible';
                break;
            }
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'access_denied', error_description }) as ErrorEvent);
          }
          game.players.push({ name: data.name });
          await game.save();
          return socket.emit(EventType.JOIN, { token: await game.generateToken(_.last(game.players).id) } as JoinServerToClientEvent);
        } catch (err) {
          this.logger.error(err);
          if (err instanceof MongooseError.ValidationError) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)) as ErrorEvent);
          }
          return socket.emit(EventType.ERROR, this.container.errors.formatServerError() as ErrorEvent);
        }
      });

      // When the socket wants to connect to a game
      socket.on(EventType.CONNECT, async (data: ConnectClientToServerEvent) => {
        try {
          const tokenData = await this.container.tokens.decode<GameTokenData>(data.token, process.env.GAME_TOKEN_KEY);
          const game = await this.db.games.findOne().where('code').equals(tokenData.code);
          if (game == null) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'not_found', error_description: 'Invalid code' }) as ErrorEvent);
          }
          if (game.status === Status.FINISHED) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'access_denied', error_description: 'Game is finished' }) as ErrorEvent);
          }
          const player = game.players.find(player => player.id === tokenData.playerId);
          if (player == null) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'not_found', error_description: 'Invalid token' }) as ErrorEvent);
          }
          socket.join(game.id);
          socket.emit(EventType.CONNECT, { game, player } as ConnectServerToClientEvent);
          return socket.to(game.id).emit(EventType.CONNECT, { player } as ConnectServerToBroadcastEvent);
        } catch (err) {
          this.logger.error(err);
          if (err instanceof MongooseError.ValidationError) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)) as ErrorEvent);
          }
          return socket.emit(EventType.ERROR, this.container.errors.formatServerError() as ErrorEvent);
        }
      });

      // When the socket wants to start a game
      socket.on(EventType.START, async (data: StartClientToServerEvent) => {
        try {
          const tokenData = await this.container.tokens.decode<GameTokenData>(data.token, process.env.GAME_TOKEN_KEY);
          const game = await this.db.games.findOne().where('code').equals(tokenData.code);
          if (game == null) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'not_found', error_description: 'Invalid code' }) as ErrorEvent);
          }
          if (game.status !== Status.INIT) {
            let error_description;
            switch (game.status) {
              case Status.IN_PROGRESS:
                error_description = 'Game in progress';
                break;
              case Status.FINISHED:
                error_description = 'Game finished';
                break;
              default:
                error_description: 'Game not accessible';
                break;
            }
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'access_denied', error_description }) as ErrorEvent);
          }
          const player = game.players.find(player => player.id === tokenData.playerId);
          if (player == null) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'not_found', error_description: 'Invalid token' }) as ErrorEvent);
          }
          if (!player.author) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors({ error: 'access_denied', error_description: 'Only the author can start game' }) as ErrorEvent);
          }
          game.status = Status.IN_PROGRESS;
          await game.save();
          return this.srv.in(game.id).emit(EventType.START, { game } as StartServerToBroadcastEvent);
        } catch (err) {
          this.logger.error(err);
          if (err instanceof MongooseError.ValidationError) {
            return socket.emit(EventType.ERROR, this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)) as ErrorEvent);
          }
          return socket.emit(EventType.ERROR, this.container.errors.formatServerError() as ErrorEvent);
        }
      });
    });
  }
}

/**
 * Websocket event types.
 */
enum EventType {
  ERROR = 'error', TEST = 'test', JOIN = 'join', CONNECT = 'co', START = 'start'
}

/**
 * Base websocket event.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Event {}

/**
 * Error event.
 */
interface ErrorEvent extends Event, APIErrorResponse {}

/**
 * Test event (client to server).
 */
interface TestClientToServerEvent extends Event {
  [key: string]: unknown;
}

/**
 * Test event (server to client).
 */
interface TestServerToClientEvent extends Event {
  [key: string]: unknown;
}

/**
 * Join event (client to server).
 */
interface JoinClientToServerEvent extends Event {
  code: string;
  name: string;
}

/**
 * Join event (server to client).
 */
interface JoinServerToClientEvent extends Event {
  token: string;
}

/**
 * Connect event (client to server).
 */
interface ConnectClientToServerEvent extends Event {
  token: string;
}

/**
 * Connect event (server to client).
 */
interface ConnectServerToClientEvent extends Event {
  game: GameInstance;
  player: PlayerAttributes;
}

/**
 * Connect event (server to broadcast).
 */
interface ConnectServerToBroadcastEvent extends Event {
  player: PlayerAttributes;
}

/**
 * Start event (client to server).
 */
interface StartClientToServerEvent extends Event {
  token: string;
}

/**
 * Start event (server to broadcast).
 */
interface StartServerToBroadcastEvent extends Event {
  game: GameInstance;
}
