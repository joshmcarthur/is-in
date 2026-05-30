import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "email-inbound",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
