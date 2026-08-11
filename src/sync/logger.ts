export class SyncLogger {
  private static formatTime(): string {
    return new Date().toISOString();
  }

  static info(message: string, ...args: any[]) {
    console.log(`[${this.formatTime()}] [INFO] [AJLB-Sync] ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[${this.formatTime()}] [WARN] [AJLB-Sync] ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`[${this.formatTime()}] [ERROR] [AJLB-Sync] ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.DEBUG) {
      console.log(`[${this.formatTime()}] [DEBUG] [AJLB-Sync] ${message}`, ...args);
    }
  }
}
