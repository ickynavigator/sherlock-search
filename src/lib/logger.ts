import { createPinoLogger } from "@bogeychan/elysia-logger";

const logger = createPinoLogger({
  //   level: env.NODE_ENV == "production" ? "info" : "debug",
  level: "debug",
});

export default logger;
