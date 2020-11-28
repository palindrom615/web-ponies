module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  env: {
    browser: true,
  },
  overrides: [
    {
      parser: "@typescript-eslint/parser",
      extends: ["plugin:@typescript-eslint/recommended"],
      plugins: ["@typescript-eslint"],
      rules: {
        "@typescript-eslint/indent": ["error", 2],
        "@typescript-eslint/prefer-interface": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
      },
      files: "src/**/*.ts",
    },
  ],
};
