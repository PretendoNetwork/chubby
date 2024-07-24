import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class NotificationThread extends Model<InferAttributes<NotificationThread>, InferCreationAttributes<NotificationThread>> {
	declare user_id: string;
	declare thread_id: string;
	declare updated: CreationOptional<Date>;
	declare created: CreationOptional<Date>;
}

NotificationThread.init({
	thread_id: {
		type: DataTypes.STRING,
		primaryKey: true
	},
	user_id: {
		type: DataTypes.STRING,
		unique: true
	},
	updated: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	},
	created: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
}, {
	sequelize,
	tableName: 'notification-threads',
	timestamps: false
});
