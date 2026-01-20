import pluginVue from "eslint-plugin-vue";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";

// Browser globals shared across all configs
const browserGlobals = {
  process: "readonly",
  window: "readonly",
  document: "readonly",
  console: "readonly",
  module: "readonly",
  navigator: "readonly",
};

export default [
  {
    ignores: ["dist/**", "node_modules/**", "public/**", "coverage/**", ".husky/**"]
  },
  
  // Base Vue Configs
  ...pluginVue.configs["flat/recommended"],
  
  // TypeScript Config (for .ts/.tsx files)
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.d.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest"
      },
      globals: browserGlobals
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "off"
    }
  },

  // Vue Config (for .vue files)
  {
    files: ["**/*.vue"],
    languageOptions: {
      // Re-assert parser for Vue to be sure, though flat/recommended does it
      parser: pluginVue.parser,
      parserOptions: {
        parser: tsParser, // Delegate script content to TS parser
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      globals: browserGlobals
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "warn", // Prevent XSS attacks
      "vue/require-default-prop": "warn", // Better prop validation
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "off"
    }
  },

  // Global overrides for JS/TS files
  {
     files: ["**/*.ts", "**/*.tsx", "**/*.vue", "**/*.js"],
     rules: {
         "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
         "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
     }
  },

  // Prettier config must be last
  eslintConfigPrettier
];