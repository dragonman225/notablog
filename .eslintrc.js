// Useful references:
// https://www.npmjs.com/package/eslint-config-react-app
// https://github.com/facebook/create-react-app/blob/master/packages/eslint-config-react-app/index.js
// https://medium.com/@dors718/linting-your-react-typescript-project-with-eslint-and-prettier-2423170c3d42

const path = require('path')

module.exports = {
  root: true, // Prevent looking for config all the way up in parent directories
  env: {
    // Enable environment-specific global variables
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    project: path.resolve(__dirname, 'tsconfig.json'),
    sourceType: 'module', // Allows for the use of imports
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    // See https://www.npmjs.com/package/@typescript-eslint/eslint-plugin#recommended-configs
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    /**
     * Use eslint-config-prettier and eslint-plugin-prettier
     * @see https://robertcooper.me/post/using-eslint-and-prettier-in-a-typescript-project
     *
     * Error: "prettier/@typescript-eslint" has been merged into "prettier" in eslint-config-prettier 8.0.0.
     * @see https://github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md#version-800-2021-02-21
     */
    'prettier', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  rules: {
    // 'arrow-spacing': ['error', { before: true, after: true }],
    // 'linebreak-style': ['error', 'unix'],
    // 'max-len': ['warn', { code: 80, tabWidth: 2 }],
    // 'no-console': 'off',
    // quotes: ['error', 'single'],
    // semi: 'off', // note you must disable the base rule as it can report incorrect errors
    // '@typescript-eslint/semi': ['error', 'never'],
    // indent: 'off',
    // '@typescript-eslint/indent': ['error', 2, { SwitchCase: 1 }],
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, classes: true },
    ],
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'none',
          requireLast: false,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      },
    ],
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
  overrides: [
    {
      files: ['*.json'],
      rules: {
        quotes: 'off',
      },
    },
  ],
}
