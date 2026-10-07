import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import globals from "globals";

export default [
  { ignores: ["dist/**", "output/**", "public/**", "raw_data/**", "node_modules/**", ".venv/**"] },
  js.configs.recommended,
  ...vue.configs["flat/essential"],
  {
    files: ["**/*.{js,mjs,cjs,vue}"],
    rules: {
      "vue/multi-word-component-names": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  { files: ["src/**/*.{js,vue}"], languageOptions: { globals: globals.browser } },
  { files: ["*.{js,cjs}", "scripts/**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.node } },
  { files: ["tests/**/*.js"], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
];
