import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: `${__dirname}/../database/database.sqlite`,
	logging: false
});
