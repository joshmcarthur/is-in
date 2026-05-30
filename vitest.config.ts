import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/shared",
      "apps/management",
      "workers/public-site",
      "workers/email-inbound",
    ],
  },
});
