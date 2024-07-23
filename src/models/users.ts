import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
	declare user_id: string;
	declare matchmaking_notification_sent: boolean;
}

User.init(
	{
		user_id: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		matchmaking_notification_sent: {
			type: DataTypes.BOOLEAN
		}
	},
	{ sequelize, tableName: 'users' }
);
