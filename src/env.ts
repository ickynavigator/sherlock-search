import { createEnv } from "@t3-oss/env-core";
import { railway } from "@t3-oss/env-core/presets";
import { z } from "zod";

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
  extends: [railway()],
});
