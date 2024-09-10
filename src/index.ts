import cors from "@elysiajs/cors";

import app from "~/app";
import { env } from "~/env";
import logger from "~/lib/logger";

app
  .onStart(async (ctx) => {
    ctx.decorator.db._client.on("error", (err) => {
      logger.error(
        "🦊 Elysia has encountered an error with the database:",
        err,
      );
    });
    ctx.decorator.db._client.on("connect", () => {
      logger.debug("🦊 Elysia connected to the database");
    });

    await ctx.decorator.db._client.connect();

    logger.debug(
      `🦊 Elysia is running at ${ctx.server?.hostname}:${ctx.server?.port}`,
    );
  })
  .onError((ctx) => {
    logger.error("🦊 Elysia has encountered an error:", ctx);
  })
  .onStop(async (ctx) => {
    await ctx.decorator.db._client.disconnect();

    logger.debug("🦊 Elysia is stopping...");
  })
  .use(cors())
  .listen(env.PORT);
