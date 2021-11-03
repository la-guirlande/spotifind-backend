import { Document, Model, Mongoose, Schema } from 'mongoose';
import ServiceContainer from '../services/service-container';
import { GameTokenData } from '../services/token-service';
import Attributes from './model';
const mongooseToJson = require('@meanie/mongoose-to-json');

/**
 * Game attributes.
 */
export interface GameAttributes extends Attributes {
  status?: Status;
  code?: string;
  players: PlayerAttributes[];
  playlistId?: string;
  shuffle: boolean;
  starting: boolean;
  inProgress: boolean;
  finished: boolean;
}

/**
 * Player attributes
 */
export interface PlayerAttributes extends Partial<Document> {
  // target: UserInstance;
  name: string;
  author?: boolean;
  score?: number;
}

/**
 * Game status.
 */
export enum Status {
  INIT = 0, TIMER_BETWEEN = 1, TIMER_CURRENT = 2, FINISHED = 3
}

/**
 * Game instance.
 */
export interface GameInstance extends GameAttributes, Document {
  generateToken(playerId: string): Promise<string>;
}

/**
 * Creates the game model.
 * 
 * @param container Services container
 * @param mongoose Mongoose instance
 * @returns Game model
 */
export default function createModel(container: ServiceContainer, mongoose: Mongoose): Model<GameInstance> {
  return mongoose.model<GameInstance>('Game', createGameSchema(container), 'games');
}

/**
 * Creates the game schema.
 * 
 * @param container Services container
 * @returns Game schema
 */
function createGameSchema(container: ServiceContainer) {
  const schema = new Schema<GameInstance>({
    status: {
      type: Schema.Types.Number,
      enum: [Status.INIT, Status.TIMER_BETWEEN, Status.TIMER_CURRENT, Status.FINISHED],
      default: Status.INIT
    },
    code: {
      type: Schema.Types.String,
      default: null
    },
    players: {
      type: [{
        type: createPlayerSchema()
      }],
      default: [],
      validate: [{
        validator: (players: PlayerAttributes[]) => players.length >= 1,
        message: 'A game must contains one player minimum'
      }, {
        validator: (players: PlayerAttributes[]) => players.length <= 10,
        message: 'A game must contains 10 players maximum'
      }]
    },
    playlistId: {
      type: Schema.Types.String,
      default: null
    },
    shuffle: {
      type: Schema.Types.Boolean,
      default: true
    }
  }, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  schema.virtual('starting').get(function(this: GameInstance) {
    return this.status === Status.INIT;
  });

  schema.virtual('inProgress').get(function(this: GameInstance) {
    return this.status === Status.TIMER_BETWEEN || this.status === Status.TIMER_CURRENT;
  });

  schema.virtual('finished').get(function(this: GameInstance) {
    return this.status === Status.FINISHED;
  });

  schema.method('generateToken', async function (this: GameInstance, playerId: string) {
    return await container.tokens.encode<GameTokenData>({ code: this.code, playerId }, process.env.GAME_TOKEN_KEY);
  });

  schema.pre('save', async function(this: GameInstance, next) {
    if (this.isNew) {
      try {
        let code;
        do {
          code = container.crypto.generateRandomNumeric(container.config.services.games.codeLength);
        } while (container.games.usedCodes.includes(code));
        this.code = code;
        container.games.usedCodes.push(code);
      } catch (err) {
        return next(err as Error);
      }
    }
    return next();
  });

  schema.plugin(mongooseToJson);

  return schema;
}

/**
 * Creates the player subschema.
 * 
 * @returns Player subschema
 */
function createPlayerSchema() {
  const schema = new Schema({
    name: {
      type: Schema.Types.String,
      required: [true, 'Player name is required'],
      maxlength: [16, 'Player name is too long (16 characters maximum)']
    },
    author: {
      type: Schema.Types.Boolean,
      default: false
    },
    score: {
      type: Schema.Types.Number,
      default: 0
    }
  }, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  schema.plugin(mongooseToJson);

  return schema;
}
