import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
// Keep local database/tool state inside this project; do not send dev telemetry.
process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
process.env.WRANGLER_SEND_METRICS ??= "false";
process.env.WRANGLER_WRITE_LOGS ??= "false";
process.env.WRANGLER_LOG_PATH ??= path.join(root, ".wrangler/logs");
process.env.WRANGLER_REGISTRY_PATH ??= path.join(
  root,
  ".wrangler/dev-registry",
);
process.env.MINIFLARE_REGISTRY_PATH ??= path.join(root, ".wrangler/registry");
