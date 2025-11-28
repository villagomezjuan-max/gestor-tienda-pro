const js = require('@eslint/js');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const jsdoc = require('eslint-plugin-jsdoc');
const security = require('eslint-plugin-security');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'data/**',
      'logs/**',
      'uploads/**',
      'scripts/**/backup/**',
      '**/*.min.js',
      '../node_modules/**',
      '../data/**',
      '../docs/**',
      '../herramientas_admin/**',
      '../icons/**',
      '../**/*.min.js',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      jsdoc,
      security,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        },
      ],
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',
      'security/detect-object-injection': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.test.js', 'tests/**/*.js', '**/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['../js/**/*.js', '../*.js', '../service-worker.js', '../sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
  },
  prettierConfig,
];
