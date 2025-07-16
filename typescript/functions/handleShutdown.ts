// Shutdown handler to gracefully exit any programs
// Based on @nfantone's nfantone/before-shutdown.js gist in:
// https://gist.github.com/nfantone/1eaa803772025df69d07f4dbf5df7e58

interface GenLogger {
  error(...message: any): void;
  info(...message: any): void;
  warning?(...message: any): void;
  warn?(...message: any): void;
}

export class BeforeShutdown {
  static SHUTDOWN_SIGNALS: Set<string> = new Set(["SIGINT", "SIGTERM"])
  static SHUTDOWN_TIMEOUT: number = 15000;

  private static logger?: GenLogger; 

  static useLogger(lg: GenLogger) {
    BeforeShutdown.logger = {
      error: lg.error.bind(lg),
      warning: lg.warning ? lg.warning.bind(lg) : undefined,
      warn:  lg.warn ? lg.warn.bind(lg) : undefined,
      info: lg.info.bind(lg),
    };
  }

  static listeners: ((...params: any[]) => void | Promise<void>)[] = [];

  private static processOnce(signals: Set<string>, cb: (...params: any) => void | Promise<void>): void {
    return signals.forEach(sig => process.once(sig, cb))
  }

  private static log(lvl: 'error' | 'info' | 'warn', ...message: any): void {
    if(!BeforeShutdown.logger){
      return
    }

    const rLvl = lvl === 'warn' ? BeforeShutdown.logger.warn ?? BeforeShutdown.logger.warning ?? BeforeShutdown.logger.error : BeforeShutdown.logger[lvl]

    rLvl(...message);
    return
  }

  private static forceExitAfter(): void {
    setTimeout(() => {
      BeforeShutdown.log('error', `Could not close resources gracefully after ${BeforeShutdown.SHUTDOWN_TIMEOUT} ms: forcing shutdown`)
      return process.exit(1);     
    }, BeforeShutdown.SHUTDOWN_TIMEOUT).unref();
  };

  private static async shutdownHandler(signalOrEvent: string) {
    BeforeShutdown.log("info", `Shutting down!`) 
    BeforeShutdown.log("info", `Trying to exit gracefully!`) 

    for (const listener of BeforeShutdown.listeners) {
      try {
        await listener(signalOrEvent);
      } catch (err) {
        BeforeShutdown.log('warn', `A shutdown handler failed before completing with: ${(err as Error).message || err}`)
      }
    }

    return process.exit(0);
  }

  static addHandler(listener: (...params: any[]) => void | Promise<void>): (...params: any[]) => void | Promise<void> {
    BeforeShutdown.listeners.push(listener);
    return listener;
  }

  static register(): void {
    // Register shutdown callback that kills the process after `SHUTDOWN_TIMEOUT` milliseconds
    // This prevents custom shutdown handlers from hanging the process indefinitely
    BeforeShutdown.processOnce(BeforeShutdown.SHUTDOWN_SIGNALS, BeforeShutdown.forceExitAfter);

    // Register process shutdown callback
    // Will listen to incoming signal events and execute all registered handlers in the stack
    BeforeShutdown.processOnce(BeforeShutdown.SHUTDOWN_SIGNALS, BeforeShutdown.shutdownHandler);
  }
}
