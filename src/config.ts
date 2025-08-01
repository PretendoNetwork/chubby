import { createConfig, zodCoercedBoolean, loaders } from '@neato/config';
import { z } from 'zod';

const config = createConfig({
	envPrefix: 'PN_CHUBBY_',
	loaders: [
		loaders.environment(),
		loaders.file('.env')
	],
	schema: z.object({
		bot_token: z.string(),
		sequelize: z.object({
			force: zodCoercedBoolean().default(false),
			alter: zodCoercedBoolean().default(false),
			postgres_uri: z.string()
		})
	})
});

export default config;
