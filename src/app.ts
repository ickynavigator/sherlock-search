import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { createClient } from "redis";

import { env } from "~/env";
import logger from "~/lib/logger";
import Queue from "~/lib/queue";
import Sherlock from "~/lib/sherlock";
import Store from "~/lib/store";
import packageJson from "../package.json";

const SWAGGER_TAGS = {
  search: "Search",
  debug: "Debug",
};

const app = new Elysia()
  .use(
    logger.into({
      autoLogging: true,
    }),
  )
  .use(rateLimit())
  .use(
    swagger({
      path: "/",
      documentation: {
        info: {
          title: "Sherlock Client",
          description:
            "A simple username search service, powered by sherlock and built with Elysia",
          version: packageJson.version,
        },
        components: {
          schemas: {
            UserResult: {
              type: "object",
              description: "The formatted search result from sherlock",
              properties: {
                org: {
                  type: "string",
                  example: "the_platform",
                  description: "The organization of the username",
                },
                url: {
                  type: "string",
                  example: "https://the_platform.com/johndoe",
                  description: "The link to the user profile",
                },
                original: {
                  type: "string",
                  example:
                    "[+] the_platform: https://www.the_platform.com/user/johndoe/",
                  description: "The original sherlock search query",
                },
              },
            },
          },
        },
      },
    }),
  )
  .state("queue", new Queue())
  .decorate(
    "db",
    new Store(
      createClient({
        password: env.REDISPASSWORD,
        url: env.REDIS_URL,
      }),
    ),
  )
  .decorate("sherlock", new Sherlock())
  .post(
    "search/:username",
    async (handler) => {
      const username = handler.params.username.trim().toLowerCase();
      const ignoreCache = handler.query.ignoreCache;

      const isInQueue = await handler.store.queue.isInQueue(username);
      if (isInQueue) {
        handler.set.status = 409;

        return {
          message: "The username is already in the queue",
          status: `/search/${username}/status`,
        };
      }

      if (ignoreCache) {
        await handler.db.deleteUser(username);
      }

      const isInStore = await handler.db.isInStore(username);
      if (isInStore) {
        handler.set.status = 200;

        return {
          message: "The username is already in the store",
          results: `/search/${username}`,
        };
      }

      const job = async () => {
        await handler.store.queue.enqueue(username);

        const search = await handler.sherlock.search(username);

        await handler.db.addUser(username, search);
        await handler.store.queue.dequeue(username);

        handler.log.debug(`Search for ${username} completed`);
      };

      try {
        job();
      } catch (e) {
        handler.log.error(e);
      }

      handler.set.status = 202;

      return {
        message: "The username is being processed",
        results: `/search/${username}`,
      };
    },
    {
      params: t.Object({
        username: t.String(),
      }),
      query: t.Object({
        ignoreCache: t.Boolean({ default: false }),
      }),

      detail: {
        tags: [SWAGGER_TAGS.search],
        parameters: [
          {
            in: "path",
            name: "username",
            required: true,
            schema: {
              type: "string",
              example: "johndoe",
            },

            description: "The username to search for.",
          },
          {
            in: "query",
            name: "ignoreCache",
            required: false,
            schema: {
              type: "boolean",
              example: "true",
            },

            description:
              "Should ignore the cached searches. This will make a new search and update the cache.",
            allowEmptyValue: true,
          },
        ],
        responses: {
          202: {
            description: "User search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "The username is being processed",
                    },
                    results: {
                      type: "string",
                      example: "/search/johndoe",
                    },
                  },
                },
              },
            },
          },
          200: {
            description: "Username already processed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "The username is already in the store",
                    },
                    results: {
                      type: "string",
                      example: "/search/johndoe",
                    },
                  },
                },
              },
            },
          },
          409: {
            description: "Username already in the queue",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "The username is already in the queue",
                    },
                    status: {
                      type: "string",
                      example: "/search/johndoe/status",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  )
  .get(
    "search/:username",
    async (handler) => {
      const username = handler.params.username.trim().toLowerCase();
      const user = await handler.db.getUser(username);

      if (user === undefined) {
        handler.set.status = 404;

        return {
          message:
            "The username has not been processed yet. Please create a search request",
        };
      }

      return user;
    },
    {
      params: t.Object({
        username: t.String(),
      }),

      detail: {
        tags: [SWAGGER_TAGS.search],
        parameters: [
          {
            in: "path",
            name: "username",
            required: true,
            schema: {
              type: "string",
              example: "johndoe",
            },

            description: "The username to search for.",
          },
        ],
        responses: {
          200: {
            description: "User search results",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/UserResult",
                  },
                  description:
                    "A list of all the search results gotten from the sherlock search",
                },
              },
            },
          },
          404: {
            description: "Username not in queue or store",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "The username has not been processed yet. Please create a search request",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  )
  .get(
    "search/:username/status",
    async (handler) => {
      const username = handler.params.username.trim().toLowerCase();
      const isInQueue = await handler.store.queue.isInQueue(username);

      if (isInQueue) {
        handler.set.status = 202;

        return {
          message: "The username is still being processed",
        };
      }

      const userInStore = await handler.db.isInStore(username);

      if (userInStore) {
        handler.set.status = 200;

        return {
          message:
            "The username has been processed. You can now get the results",
          results: `/search/${username}`,
        };
      }

      handler.set.status = 404;
      return {
        message:
          "The username has not been processed yet. Please create a search request",
      };
    },
    {
      params: t.Object({
        username: t.String(),
      }),

      detail: {
        tags: [SWAGGER_TAGS.search],
        parameters: [
          {
            in: "path",
            name: "username",
            required: true,
            schema: {
              type: "string",
              example: "johndoe",
            },

            description: "The username to search for.",
          },
        ],
        responses: {
          200: {
            description: "User search status",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example:
                          "The username has been processed. You can now get the results",
                      },
                      results: {
                        type: "string",
                        example: "/search/johndoe",
                      },
                    },
                  },
                  description:
                    "A list of all the search results gotten from the sherlock search",
                },
              },
            },
          },
          202: {
            description: "Username already in the queue",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "The username is already in the queue",
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "Username not in queue or store",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "The username has not been processed yet. Please create a search request",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  )
  .get(
    "search/:username/stream",
    async function* (ctx) {
      const username = ctx.params.username.trim().toLowerCase();

      const ignoreCache = ctx.query.ignoreCache;
      if (ignoreCache) await ctx.db.deleteUser(username);

      const user = await ctx.db.getUser(username);
      if (user) yield user;

      let results = [];

      // TODO: also kill the job
      const isInQueue = await ctx.store.queue.isInQueue(username);
      if (isInQueue) await ctx.store.queue.dequeue(username);

      await ctx.store.queue.enqueue(username);

      const stream = ctx.sherlock.searchStream(username);

      while (true) {
        const { done, value } = await stream.next();

        if (done) {
          results = value;
          break;
        }

        results.push(value);
        yield results;
      }

      await ctx.db.addUser(username, results);
      await ctx.store.queue.dequeue(username);

      yield results;
    },
    {
      params: t.Object({
        username: t.String(),
      }),
      query: t.Object({
        ignoreCache: t.Boolean({ default: false }),
      }),

      detail: {
        tags: [SWAGGER_TAGS.search],
        parameters: [
          {
            in: "path",
            name: "username",
            required: true,
            schema: {
              type: "string",
              example: "johndoe",
            },

            description: "The username to search for.",
          },
        ],
      },
    },
  )
  .get(
    "debug",
    async (handler) => {
      const store = await handler.db.debug();
      const queue = await handler.store.queue.debug();

      return { store, queue };
    },
    {
      detail: {
        tags: [SWAGGER_TAGS.debug],
        responses: {
          200: {
            description: "Debug information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    store: {
                      description: "The current store state",
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                    queue: {
                      description: "The current queue state",
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  );
export default app;
