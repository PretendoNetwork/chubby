import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';

export class MatchmakingThread extends Model<InferAttributes<MatchmakingThread>, InferCreationAttributes<MatchmakingThread>> {
	declare thread_id: string;
	declare last_message_sent: Date;
}

MatchmakingThread.init(
	{
		thread_id: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		last_message_sent: {
			type: DataTypes.DATE
		}
	},
	{
		sequelize,
		tableName: 'matchmaking_threads',
		timestamps: false
	}
);
