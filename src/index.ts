import app from "~/app";
import { env } from "~/env";

app
  .onStart(() => {
    // eslint-disable-next-line no-console
    console.debug(
      `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
    );
  })
  .listen(env.PORT);
