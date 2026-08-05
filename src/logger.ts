// Persistent error logger. Patches console.error and installs global error /
// unhandledrejection handlers, appending each entry to a rotating log file at
// the vault root. Purpose: catch what happens when Obsidian white-screens or
// a plugin blows up silently — DevTools console is gone by the time we can
// react. This survives.
//
// Design notes:
// - Uses vault.adapter (async) so it plays with Obsidian Sync and doesn't
//   fight the file watcher.
// - Only wires up console.error (not console.log / console.warn). We want
//   signal, not the entire startup noise stream.
// - Rotates when the log exceeds MAX_BYTES to keep it bounded. Old rotations
//   overwrite each other (only one .1 kept).
// - Anti-loop: our own appendPromise's failure path is silenced with the
//   ORIGINAL console.error, never the patched one.

import { App } from "obsidian";

const LOG_PATH = "debug.log";
const LOG_ROTATED_PATH = "debug.log.1";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export class ErrorLogger {
  private app: App;
  private originalConsoleError: (...args: any[]) => void;
  private errorHandler: (ev: ErrorEvent) => void;
  private rejectionHandler: (ev: PromiseRejectionEvent) => void;
  private currentSize = 0;
  private installed = false;

  constructor(app: App) {
    this.app = app;
    this.originalConsoleError = console.error.bind(console);
    this.errorHandler = (ev) => {
      this.write("error", `${ev.message}\n${(ev.error && ev.error.stack) || ""}`);
    };
    this.rejectionHandler = (ev) => {
      const reason = ev.reason;
      const msg = reason && reason.stack ? reason.stack : String(reason);
      this.write("unhandledRejection", msg);
    };
  }

  async install(): Promise<void> {
    if (this.installed) return;
    this.installed = true;
    try {
      const existing = await this.app.vault.adapter.exists(LOG_PATH);
      if (existing) {
        const stat = await this.app.vault.adapter.stat(LOG_PATH);
        this.currentSize = stat?.size ?? 0;
      }
    } catch (e) {
      // Best effort; if we can't stat, treat as fresh.
      this.currentSize = 0;
    }
    // Header line so we can find where a session started when reading the log
    await this.write("session", `logger installed at ${new Date().toISOString()}`);

    // Patch console.error to duplicate through our logger.
    const orig = this.originalConsoleError;
    const self = this;
    console.error = function (...args: any[]) {
      try {
        const msg = args
          .map((a) => (a instanceof Error ? `${a.message}\n${a.stack || ""}` : String(a)))
          .join(" ");
        void self.write("console.error", msg);
      } catch (e) {
        // Ignore — never let logging errors bubble up.
      }
      orig(...args);
    };

    // Global error hooks — catch renderer-side crashes before the white-screen.
    window.addEventListener("error", this.errorHandler);
    window.addEventListener("unhandledrejection", this.rejectionHandler);
  }

  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;
    console.error = this.originalConsoleError;
    window.removeEventListener("error", this.errorHandler);
    window.removeEventListener("unhandledrejection", this.rejectionHandler);
  }

  private async write(kind: string, msg: string): Promise<void> {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${kind}] ${msg}\n`;
    try {
      // Rotate if we'd exceed the cap.
      if (this.currentSize + line.length > MAX_BYTES) {
        try {
          if (await this.app.vault.adapter.exists(LOG_ROTATED_PATH)) {
            await this.app.vault.adapter.remove(LOG_ROTATED_PATH);
          }
          await this.app.vault.adapter.rename(LOG_PATH, LOG_ROTATED_PATH);
        } catch (e) {
          // Rotation failed; write anyway.
        }
        this.currentSize = 0;
      }
      await this.app.vault.adapter.append(LOG_PATH, line);
      this.currentSize += line.length;
    } catch (e) {
      // Use ORIGINAL console.error — never the patched one — to avoid loops.
      this.originalConsoleError("[ErrorLogger] write failed:", e);
    }
  }
}
