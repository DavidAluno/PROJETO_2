import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      importPlugin.flatConfigs.recommended,
      jsxA11y.flatConfigs.recommended,
      react.configs.flat.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.jsx'] },
      },
      react: { version: 'detect' },
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
      'react/react-in-jsx-scope': 'off',
      // This JavaScript project has no static props type system yet. Runtime
      // prop declarations would duplicate the component contracts for now.
      'react/prop-types': 'off',
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
      // The resolver validates local paths; package exports are resolved by Vite.
      'import/no-unresolved': ['error', { ignore: ['^(?!\\.{1,2}/).+$'] }],
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
])
