import { createPinoLogger } from "@bogeychan/elysia-logger";

const logger = createPinoLogger({
  level: "debug",
  msgPrefix: "🦊 Elysia:",
  timestamp: true,
});

export default logger;
