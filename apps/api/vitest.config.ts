import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@mindful-mastery/common/index": resolve(__dirname, "../../packages/common/src/index.ts"),
      "@mindful-mastery/config/index": resolve(__dirname, "../../packages/config/src/index.ts")
    }
  },
  test: {
    include: ["test/**/*.test.ts"]
  }
});
