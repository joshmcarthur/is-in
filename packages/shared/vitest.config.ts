import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@is-in/shared",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
