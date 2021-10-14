import ServiceContainer from './services/service-container';

ServiceContainer.getInstance().srv.start().then(() => console.log('Environment :', ServiceContainer.getInstance().env.nodeEnv)).catch(console.error);
