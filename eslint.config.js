/* eslint-env node */
import "@rushstack/eslint-patch/modern-module-resolution";

module.exports = {
    root: true,
    env: {
        node: true,
        browser: true,
        es2021: true,
    },
    extends: [
        "plugin:vue/vue3-recommended",
        "eslint:recommended",
        "@vue/eslint-config-typescript",
        "prettier",
    ],
    parserOptions: {
        ecmaVersion: "latest",
    },
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "vue/multi-word-component-names": "off", // Allows "Home.vue" instead of "HomePage.vue"
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
};