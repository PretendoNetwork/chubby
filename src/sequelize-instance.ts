import { Sequelize } from 'sequelize';
import config from '@/config';

export const sequelize = new Sequelize(config.sequelize.postgres_uri, {
	dialect: 'postgres',
	logging: false
});
