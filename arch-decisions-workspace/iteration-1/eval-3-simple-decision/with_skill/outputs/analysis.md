# Analysis: Adding a Debug Log Level

## Decision: No Architecture Decision Needed

This does not require the architecture decision process. Just add the debug level.

### Why This Is "Just Make the Call"

The skill explicitly says to skip the full process when:

- **The codebase has established a clear pattern and you're following it.** The logger already has `info`, `warn`, and `error` methods, each a one-line console wrapper. Adding `debug` is identical in shape.
- **The decision is purely implementation-level.** Adding a method to an existing object that follows the exact same pattern as its siblings is not an architectural decision.
- **The decision is easily reversible.** If `debug` turns out to be wrong, you delete one line.
- **Only one reasonable option exists given the constraints.** The logger is 6 lines. The project has zero dependencies beyond Express. A `logLevel` config already exists in `config.ts`, signaling that log level filtering was anticipated.

### Why a Logging Library Is Not Warranted

The project is a simple Express API with a 6-line logger and no complex logging needs visible in the codebase. Introducing a library like `pino` or `winston` would:

- Add a dependency to a project that currently has only `express`
- Solve problems the project doesn't have (structured output, log rotation, transports, child loggers)
- Require changing every call site for no functional benefit today

If the project later needs structured logging, multiple transports, or log aggregation, that would be the time to evaluate a logging library -- and that *would* be an architecture decision worth the full process.

### What to Do

Add a `debug` method to the existing logger in `src/utils/logger.ts`, following the same pattern as the other methods:

```ts
debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
```

Optionally, wire up the existing `logLevel` config to suppress debug output in production, since `config.ts` already reads `LOG_LEVEL` from the environment.
