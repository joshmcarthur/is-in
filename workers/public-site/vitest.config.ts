import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "public-site",
    include: ["src/**/*.test.ts"],
    environmentMatchGlobs: [["src/parse-site-host.test.ts", "node"]],
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
});
