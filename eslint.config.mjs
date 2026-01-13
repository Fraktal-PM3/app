export default [
	{

		ignores: [
			'node_modules/**',
			'.next/**',
			'out/**',
			'build/**',
			'next-env.d.ts',
		],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {},
	},
];
