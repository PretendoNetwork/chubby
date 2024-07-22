import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
	declare user_id: string;
	declare xp: CreationOptional<number>;
	declare last_xp_message_sent: CreationOptional<Date | null>;
	declare trusted_time_start_date: CreationOptional<Date | null>;
	declare matchmaking_notification_sent: CreationOptional<boolean>;
}

User.init(
	{
		user_id: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		xp: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		last_xp_message_sent: {
			type: DataTypes.DATE,
			defaultValue: null
		},
		trusted_time_start_date: {
			type: DataTypes.DATE,
			defaultValue: null
		},
		matchmaking_notification_sent: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		}
	},
	{ sequelize, tableName: 'users' }
);
