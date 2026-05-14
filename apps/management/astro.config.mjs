import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "hybrid",
  site: process.env.PUBLIC_SITE_URL,
  adapter: cloudflare({
    imageService: "passthrough",
  }),
});
