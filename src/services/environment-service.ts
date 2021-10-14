import dotenv from 'dotenv';
import Service from './service';
import ServiceContainer from './service-container';

/**
 * Environment service class.
 * 
 * This service is only used to load environment variables from `.env` file.
 */
export default class EnvironmentService extends Service {

  /**
   * Creates a new environment service.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container);
  }

  /**
   * Loads environment.
   */
  public load(): void {
    dotenv.config();
  }

  /**
   * Gets the current node environment the application is running.
   */
  public get nodeEnv(): EnvironmentType {
    return process.env.NODE_ENV as EnvironmentType || 'development';
  }
}

/**
 * Node environment type.
 */
type EnvironmentType = 'development' | 'production';
