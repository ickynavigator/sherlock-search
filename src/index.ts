import app from "~/app";

const PORT = 3000;

app.listen(PORT);

// eslint-disable-next-line no-console
console.debug(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
