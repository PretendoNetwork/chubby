import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class NsfwExemption extends Model<InferAttributes<NsfwExemption>, InferCreationAttributes<NsfwExemption>> {
	declare id: CreationOptional<number>;
	declare user_id: string;
	declare hash: string;
	declare created: CreationOptional<Date>;
}

NsfwExemption.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	user_id: {
		type: DataTypes.STRING
	},
	hash: {
		type: DataTypes.STRING
	},
	created: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
}, { sequelize, tableName: 'nsfw-exemptions', timestamps: false });
