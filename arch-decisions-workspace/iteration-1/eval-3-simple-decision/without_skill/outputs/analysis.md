# Adding a Debug Log Level to the Logger

## Decision

Just add it. No logging library needed.

## Rationale

The current logger in `src/utils/logger.ts` is a thin console wrapper with three levels (info, warn, error). The codebase is a simple Express API with no dependencies beyond Express itself and no complex logging requirements (no structured JSON output, no log rotation, no transports, no remote aggregation).

Adding a `debug` level is a one-line addition to the existing pattern. The project already has a `LOG_LEVEL` config value in `src/utils/config.ts` that can gate whether debug output is emitted.

A proper logging library (pino, winston, etc.) would be warranted if the project needed:

- Structured JSON logs for a log aggregation service
- Multiple transports (file, stdout, remote)
- Log rotation
- Performance-sensitive high-throughput logging
- Child loggers with context propagation

None of those apply here. Introducing a library dependency for a six-line logger wrapper would be over-engineering.

## Implementation

Add a `debug` method that only emits output when the configured log level is `debug`:

```ts
// src/utils/logger.ts
import { config } from './config';

export const logger = {
  debug: (msg: string, data?: any) => {
    if (config.logLevel === 'debug') {
      console.debug(`[DEBUG] ${msg}`, data || '');
    }
  },
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};
```

Set `LOG_LEVEL=debug` in the environment to enable debug output. All other levels continue to emit unconditionally, which matches the current behavior.

## When to Revisit

If the project grows to need structured logging, multiple output targets, or log-level filtering across all levels (not just debug), that is the point to introduce pino or a similar library. Not before.
