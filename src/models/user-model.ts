import { Document, Model, Mongoose, Schema } from 'mongoose';
const mongooseToJson = require('@meanie/mongoose-to-json');
import ServiceContainer from '../services/service-container';
import Attributes from './model';

/**
 * User attributes.
 */
export interface UserAttributes extends Attributes {
  spotifyId: string;
}

/**
 * User instance.
 */
export interface UserInstance extends UserAttributes, Document {}

/**
 * Creates the user model.
 * 
 * @param container Services container
 * @param mongoose Mongoose instance
 */
export default function createModel(container: ServiceContainer, mongoose: Mongoose): Model<UserInstance> {
  return mongoose.model('User', createUserSchema(), 'users');
}

/**
 * Creates the user schema.
 * 
 * @returns User schema
 */
function createUserSchema() {
  const schema = new Schema<UserInstance>({
    spotifyId: {
      type: Schema.Types.String,
      required: [true, 'Spotify user ID is required']
    }
  }, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  schema.plugin(mongooseToJson);

  return schema;
}
