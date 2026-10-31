import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const routeBoundary = {
  group: ["@/app", "@/app/**"],
  message: "Route entries compose features; reusable code must not import app routes.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historical, disabled one-off migration scripts, never application code.
    "scripts/archive/**",
    "tests/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["src/{features,components,providers}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/lib/api",
          message: "Import a domain client from @/lib/api/modules/*, contracts or storage directly.",
        }],
        patterns: [routeBoundary],
      }],
    },
  },
  {
    files: ["src/{lib,types,config}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/**", "@/features/**", "@/components/**", "@/providers/**"],
          message: "Infrastructure and shared contracts must not depend on UI or providers.",
        }],
      }],
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [routeBoundary, {
          group: ["@/features/**", "@/providers/**", "@/lib/api", "@/lib/api/**"],
          message: "UI primitives receive data and callbacks through props; keep business dependencies outside.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
