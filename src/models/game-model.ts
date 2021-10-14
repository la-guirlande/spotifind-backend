import { Document, Model, Mongoose, Schema } from 'mongoose';
import ServiceContainer from '../services/service-container';
import Attributes from './model';
const mongooseToJson = require('@meanie/mongoose-to-json');

/**
 * Game attributes.
 */
export interface GameAttributes extends Attributes {
  status?: Status;
  code?: string;
  players: PlayerAttributes[];
}

/**
 * Player attributes
 */
export interface PlayerAttributes {
  token?: string;
  // target: UserInstance;
  name: string;
  author?: boolean;
  score?: number;
}

/**
 * Game status.
 */
export enum Status {
  INIT = 0, IN_PROGRESS = 1, FINISHED = 2
}

/**
 * Game instance.
 */
export interface GameInstance extends GameAttributes, Document {}

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
      enum: [Status.INIT, Status.IN_PROGRESS, Status.FINISHED],
      default: Status.INIT
    },
    code: {
      type: Schema.Types.String,
      default: null
    },
    players: {
      type: [{
        type: createPlayerSchema(container)
      }],
      default: [],
      validate: [{
        validator: (players: PlayerAttributes[]) => players.length >= 1,
        message: 'A game must contains one player minimum'
      }, {
        validator: (players: PlayerAttributes[]) => players.length <= 10,
        message: 'A game must contains 10 players maximum'
      }]
    }
  }, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
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
 * @param container Services container
 * @returns Player subschema
 */
function createPlayerSchema(container: ServiceContainer) {
  const schema = new Schema({
    token: {
      type: Schema.Types.String,
      default: null
    },
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
    _id: false,
    id: false,
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  schema.pre('save', async function(this: PlayerAttributes & Document, next) {
    if (this.isNew) {
      this.token = container.crypto.generateRandomString(32);
    }
    return next();
  });

  schema.plugin(mongooseToJson);

  return schema;
}
