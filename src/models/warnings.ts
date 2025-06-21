import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Warning extends Model<InferAttributes<Warning>, InferCreationAttributes<Warning>> {
	declare id: CreationOptional<number>;
	declare user_id: string;
	declare admin_user_id: string;
	declare reason: string;
	declare timestamp: CreationOptional<Date>;
	declare expires_at: CreationOptional<Date | null>;
}

Warning.init({
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
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	},
	expires_at: {
		type: DataTypes.DATE,
		allowNull: true,
		defaultValue: null
	}
}, { sequelize, tableName: 'warnings' });
