import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

const isCi = process.env.CI === "true" || process.env.CI === "1";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  adapter: cloudflare({
    imageService: "passthrough",
    sessionKVBindingName: "KV",
    ...(isCi ? { remoteBindings: false } : {}),
  }),
});
