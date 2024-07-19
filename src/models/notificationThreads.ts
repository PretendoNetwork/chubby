import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class NotificationThread extends Model<InferAttributes<NotificationThread>, InferCreationAttributes<NotificationThread>> {
	declare id: CreationOptional<number>;
	declare user_id: string;
	declare thread_id: string;
	declare updated: CreationOptional<Date>;
	declare created: CreationOptional<Date>;
}

NotificationThread.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	user_id: {
		type: DataTypes.STRING
	},
	thread_id: {
		type: DataTypes.STRING
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
	timestamps: false,
	indexes: [
		{
			name: 'notification-threads_user_id_idx',
			fields: ['user_id']
		}
	]
});
