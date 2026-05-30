import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "management",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
