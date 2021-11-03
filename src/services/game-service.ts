import _ from 'lodash';
import { Status } from '../models/game-model';
import Service from './service';
import ServiceContainer from './service-container';

/**
 * Games service class.
 * 
 * This service is used to manages games.
 */
export default class GameService extends Service {

  private _usedCodes: string[];
  private readonly autoFinishInactiveGamesTaskName: string;

  /**
   * Creates a new games service.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container);
    this._usedCodes = [];
    this.autoFinishInactiveGamesTaskName = 'auto-finish-inactive-games';
    this.finishInactiveGamesTask = this.finishInactiveGamesTask.bind(this);
  }

  /**
   * Starts games schedulers.
   */
  public async startSchedulers(): Promise<void> {
    this.finishInactiveGamesTask();
    this.container.scheduler.runTask( this.autoFinishInactiveGamesTaskName, this.finishInactiveGamesTask, this.container.config.services.games.autoFinishInactiveGamesCooldown * 60 * 1000);
  }

  /**
   * Stops games schedulers.
   */
  public stopSchedulers(): void {
    this.container.scheduler.stopTask(this.autoFinishInactiveGamesTaskName);
  }

  /**
   * Fetches used codes.
   * 
   * This method is only executed at startup. New game codes are automatically added in the `usedCodes` attribute.
   */
  public async fetchUsedCodes(): Promise<void> {
    this._usedCodes = (await this.db.games.find().where('code').ne(null).select('code')).map(game => game.code);
    this.logger.info('Fetched used codes :', this._usedCodes);
  }

  private async finishInactiveGamesTask(): Promise<void> {
    const limitDate = new Date(Date.now() - this.container.config.services.games.inactiveTime * 60 * 1000);
    const startedGames = await this.db.games.find().where('status').in([Status.INIT, Status.TIMER_BETWEEN, Status.TIMER_CURRENT]);
    const inactiveGames = startedGames.filter(game => game.updatedAt.getTime() < limitDate.getTime());
    inactiveGames.forEach(async game => {
      try {
        _.remove(this._usedCodes, game.code);
        game.status = Status.FINISHED;
        game.code = null;
        await game.save();
      } catch (err) {
        this.logger.error('Could not finish inactive game', game.id, ':', err);
      }
    });
    if (inactiveGames.length > 0) {
      this.logger.info(inactiveGames.length, `inactive ${inactiveGames.length === 1 ? 'game has' : 'games have'} been set as finished`);
    }
  }

  public get usedCodes(): string[] {
    return this._usedCodes;
  }
}
