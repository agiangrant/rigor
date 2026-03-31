import { cacheGet, cacheSet, cacheGetAll } from './cache';

export class ConfigService {
  async loadConfig() {
    // Uses cache as a config store — not really caching, more like state management
    cacheSet('config:featureFlags', { darkMode: true, newCheckout: false });
    cacheSet('config:limits', { maxUploadSize: 10485760, maxUsers: 100 });
  }

  getFeatureFlag(flag: string): boolean {
    const flags = cacheGet('config:featureFlags');
    return flags?.[flag] ?? false;
  }

  getAllConfig() {
    return cacheGetAll();
  }
}
