import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';

export class ModPingSettings extends Model<InferAttributes<ModPingSettings>, InferCreationAttributes<ModPingSettings>> {
    declare user_id: string;
    declare settings: string;
}

ModPingSettings.init(
    {
        user_id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        settings: {
            type: DataTypes.TEXT
        }
    },
    {
        sequelize,
        tableName: 'mod_ping_settings',
        timestamps: false
    }
);
