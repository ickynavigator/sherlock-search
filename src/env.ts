import { createEnv } from "@t3-oss/env-core";
import { railway } from "@t3-oss/env-core/presets";
import { z } from "zod";

/**
 * Redis Environment Variables
 * @see https://docs.railway.app/guides/redis#connect
 */
const redis = () =>
  createEnv({
    server: {
      REDISHOST: z.string().optional(),
      REDISUSER: z.string().optional(),
      REDISPORT: z.string().optional(),
      REDISPASSWORD: z.string().optional(),
      REDIS_URL: z.string().optional(),
    },
    runtimeEnv: process.env,
  });

export const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {
    PORT: z.string().default("3000"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  },
  extends: [railway(), redis()],
});
