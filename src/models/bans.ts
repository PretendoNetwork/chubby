import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Ban extends Model<InferAttributes<Ban>, InferCreationAttributes<Ban>> {
	declare id: CreationOptional<number>;
	declare user_id: string;
	declare admin_user_id: string;
	declare reason: string;
	declare from_warning: CreationOptional<boolean>;
	declare from_kick: CreationOptional<boolean>;
	declare timestamp: CreationOptional<Date>;
}

Ban.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	user_id: {
		type: DataTypes.STRING
	},
	admin_user_id: {
		type: DataTypes.STRING
	},
	reason: {
		type: DataTypes.STRING
	},
	from_warning: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	from_kick: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
}, { sequelize, tableName: 'bans' });
