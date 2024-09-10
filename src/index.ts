import cors from "@elysiajs/cors";

import app from "~/app";
import { env } from "~/env";
import logger from "~/lib/logger";

app
  .onStart(async (ctx) => {
    ctx.decorator.db._client.on("error", (err) => {
      logger.error("DB: Encountered an error:", err);
    });

    ctx.decorator.db._client.on("connect", () => {
      logger.debug("DB: Connected to the database");
    });

    await ctx.decorator.db._client.connect();

    logger.debug(`Running at ${ctx.server?.hostname}:${ctx.server?.port}`);
  })
  .onError((ctx) => {
    logger.error("Encountered an error:", ctx.error);
  })
  .onStop(async (ctx) => {
    await ctx.decorator.db._client.disconnect();
    logger.debug("Gracefully stopping...");
  })
  .use(cors())
  .listen(env.PORT);
