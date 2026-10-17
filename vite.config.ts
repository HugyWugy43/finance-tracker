import "./scripts/runtime-env.mjs";
import vinext from "vinext";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(async () => {
  if (process.env.ORBIT_RUNTIME === "node") {
    return {
      resolve: {
        alias: {
          "cloudflare:workers": fileURLToPath(
            new URL("./lib/turso.ts", import.meta.url),
          ),
        },
      },
      plugins: [vinext()],
    };
  }
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    plugins: [
      vinext(),
      cloudflare({
        configPath: "./wrangler.local.jsonc",
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
      }),
    ],
  };
});
