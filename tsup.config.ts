import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/bot.ts'],
	splitting: false,
	sourcemap: true,
	platform: 'node',
	clean: true,
	format: ['cjs']
});
