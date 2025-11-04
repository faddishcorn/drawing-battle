// ESLint v9 flat config (Next.js + TypeScript + React)
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import a11yPlugin from 'eslint-plugin-jsx-a11y'
import prettierPlugin from 'eslint-plugin-prettier'

export default [
  // Global ignores
  {
    ignores: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'out',
      'coverage',
      '**/*.css',
      'eslint.config.mjs',
    ],
  },
  // Base JS recommended
  js.configs.recommended,
  // Project rules
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      'jsx-a11y': a11yPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier
      'prettier/prettier': ['error'],

      // React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/require-default-props': 'off',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
      // Allow JSX in TSX files
      'react/jsx-filename-extension': 'off',
      'react/jsx-no-constructed-context-values': 'off',

      // Imports (relax for TS + Next alias paths)
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.*',
            '**/*.spec.*',
            '**/next.config.*',
            '**/*.config.*',
            'eslint.config.mjs',
          ],
        },
      ],

      // TypeScript
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // General
      camelcase: 'off',
      'no-underscore-dangle': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'no-empty': 'warn',
      'no-plusplus': 'warn',
      'no-console': 'warn',
    },
  },
  // Targeted overrides
  {
    files: ['lib/firebase.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'global-require': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'import/no-unresolved': 'off',
    },
  },
]
