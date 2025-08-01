import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

export class MessageAuditRelationship extends Model<InferAttributes<MessageAuditRelationship>, InferCreationAttributes<MessageAuditRelationship>> {
	declare id: CreationOptional<number>;
	declare message_id: string;
	declare log_event_id: string;
	declare created: CreationOptional<Date>;
}

MessageAuditRelationship.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	message_id: {
		type: DataTypes.STRING
	},
	log_event_id: {
		type: DataTypes.STRING,
		unique: true
	},
	created: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
}, {
	sequelize,
	tableName: 'message-audit-relationships',
	timestamps: false,
	indexes: [
		{
			name: 'mar-created_idx',
			fields: ['created']
		}
	]
});
