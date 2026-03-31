export class ConfigService {
  private config = new Map<string, unknown>();

  async loadConfig() {
    this.config.set('featureFlags', { darkMode: true, newCheckout: false });
    this.config.set('limits', { maxUploadSize: 10485760, maxUsers: 100 });
  }

  getFeatureFlag(flag: string): boolean {
    const flags = this.config.get('featureFlags') as Record<string, boolean> | undefined;
    return flags?.[flag] ?? false;
  }

  getAllConfig(): Map<string, unknown> {
    return new Map(this.config);
  }
}
