import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".vinext/**",
    "dist/**",
    "design/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    files: ["components/profile-view.tsx"],
    rules: {
      // A fixed-size local illustration does not need a remote image optimizer.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
