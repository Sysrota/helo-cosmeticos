import { Queue } from "bullmq";

import { redis } from "../config/redis.js";

export const aiQueue =
  new Queue(
    "ai-attendance",
    {
      connection: redis,
    }
  );