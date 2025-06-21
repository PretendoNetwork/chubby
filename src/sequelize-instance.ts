import { Sequelize } from 'sequelize';
import config from '@/config';

export const sequelize = new Sequelize(config.sequelize.postgres_uri, {
	dialect: 'postgres'
});

sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_phash"').catch((error) => {
	console.error('Failed to create pg_phash extension - make sure you\'re using the PretendoNetwork/postgres-with-extensions image!', error);
	process.exit(1);
});
