import app from "~/app";
import { env } from "~/env";

app
  .onStart(async (ctx) => {
    // eslint-disable-next-line no-console
    ctx.decorator.db._client.on("error", console.error);

    // eslint-disable-next-line no-console
    ctx.decorator.db._client.on("connect", console.debug);

    await ctx.decorator.db._client.connect();

    // eslint-disable-next-line no-console
    console.debug(
      `🦊 Elysia is running at ${ctx.server?.hostname}:${ctx.server?.port} at ${new Date().toISOString()}`,
    );
  })
  .onError((ctx) => {
    // eslint-disable-next-line no-console
    console.error("🦊 Elysia has encountered an error:", ctx);
  })
  .onStop(async (handler) => {
    await handler.decorator.db._client.disconnect();

    // eslint-disable-next-line no-console
    console.debug("🦊 Elysia is stopping...");
  })
  .listen(env.PORT);
