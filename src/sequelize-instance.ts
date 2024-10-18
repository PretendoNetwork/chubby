import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: `${process.cwd()}/database/database.sqlite`,
	logging: false
});
