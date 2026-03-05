import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
