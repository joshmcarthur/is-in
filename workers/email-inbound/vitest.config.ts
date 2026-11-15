import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "email-inbound",
    include: ["src/**/*.test.ts"],
    environmentMatchGlobs: [["src/parse-recipient.test.ts", "node"]],
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
});
