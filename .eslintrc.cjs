module.exports = {
	env: {
		node: true,
		es2021: true
	},
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	overrides: [
		{
			env: {
				node: true
			},
			files: ['.eslintrc.{js,cjs}'],
			parserOptions: {
				sourceType: 'script'
			}
		},
		{
			env: {
				browser: true
			},
			files: ['packages/extension/**/*.ts'],
			globals: {
				chrome: 'readonly'
			}
		}
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module'
	},
	plugins: ['@typescript-eslint'],
	rules: {
		'no-mixed-spaces-and-tabs': 'off',
		'no-case-declarations': 'off',
		'no-empty': ['error', { allowEmptyCatch: true }],
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
		]
	}
}
