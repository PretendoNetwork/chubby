import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class NsfwWarning extends Model<InferAttributes<NsfwWarning>, InferCreationAttributes<NsfwWarning>> {
	declare id: CreationOptional<number>;
	declare user_id: string;
	declare probability: number;
	declare created: CreationOptional<Date>;
}

NsfwWarning.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	user_id: {
		type: DataTypes.STRING
	},
	probability: {
		type: DataTypes.DOUBLE
	},
	created: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
}, {
	sequelize,
	tableName: 'nsfw-warnings',
	timestamps: false,
	indexes: [
		{
			name: 'nsfw-warnings_user_id_idx',
			fields: ['user_id']
		}
	]
});
