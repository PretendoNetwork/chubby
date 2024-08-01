import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';

export class ModPingSettings extends Model<InferAttributes<ModPingSettings>, InferCreationAttributes<ModPingSettings>> {
    declare user_id: string;
    declare online: boolean;
	declare idle: boolean;
	declare dnd: boolean;
	declare offline: boolean;
}

ModPingSettings.init(
	{
		user_id: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		online: {
			type: DataTypes.BOOLEAN
		},
		idle: {
			type: DataTypes.BOOLEAN
		},
		dnd: {
			type: DataTypes.BOOLEAN
		},
		offline: {
			type: DataTypes.BOOLEAN
		}
	},
	{
		sequelize,
		tableName: 'mod_ping_settings',
		timestamps: false
	}
);
