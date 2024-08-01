import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@/sequelize-instance';
import type {
	Association,
	CreationOptional,
	ForeignKey,
	HasManyAddAssociationMixin,
	HasManyAddAssociationsMixin,
	HasManyCountAssociationsMixin,
	HasManyCreateAssociationMixin,
	HasManyGetAssociationsMixin,
	HasManyHasAssociationMixin,
	HasManyHasAssociationsMixin,
	HasManyRemoveAssociationMixin,
	HasManyRemoveAssociationsMixin,
	HasManySetAssociationsMixin,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute
} from 'sequelize';

export class SlowMode extends Model<InferAttributes<SlowMode>, InferCreationAttributes<SlowMode>> {
	declare id: CreationOptional<number>;
	declare channel_id: string;
	declare window: CreationOptional<number>;
	declare enabled: CreationOptional<boolean>;
	declare users?: CreationOptional<number>;
	declare rate?: CreationOptional<number>;

	declare getStages: HasManyGetAssociationsMixin<SlowModeStage>; // Note the null assertions!
	declare addStage: HasManyAddAssociationMixin<SlowModeStage, number>;
	declare addStages: HasManyAddAssociationsMixin<SlowModeStage, number>;
	declare setStages: HasManySetAssociationsMixin<SlowModeStage, number>;
	declare removeStage: HasManyRemoveAssociationMixin<SlowModeStage, number>;
	declare removeStages: HasManyRemoveAssociationsMixin<SlowModeStage, number>;
	declare hasStage: HasManyHasAssociationMixin<SlowModeStage, number>;
	declare hasStages: HasManyHasAssociationsMixin<SlowModeStage, number>;
	declare countStages: HasManyCountAssociationsMixin;
	declare createStage: HasManyCreateAssociationMixin<SlowModeStage, 'ownerId'>;
	declare stages?: NonAttribute<SlowModeStage[]>;

	declare static associations: {
		stages: Association<SlowMode, SlowModeStage>;
	}
}

SlowMode.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	channel_id: {
		type: DataTypes.STRING,
		unique: true
	},
	enabled: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	},
	window: {
		type: DataTypes.NUMBER,
		defaultValue: 60000
	},
	users: {
		type: DataTypes.NUMBER,
		allowNull: true
	},
	rate: {
		type: DataTypes.NUMBER,
		allowNull: true
	}
}, { sequelize, tableName: 'slow-mode' });

export class SlowModeStage extends Model<InferAttributes<SlowModeStage>, InferCreationAttributes<SlowModeStage>> {
	declare id: CreationOptional<number>;
	declare threshold: number;
	declare limit: number;

	declare ownerId: ForeignKey<SlowMode['id']>;
	declare owner?: NonAttribute<SlowMode>;
}

SlowModeStage.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	threshold: {
		type: DataTypes.NUMBER
	},
	limit: {
		type: DataTypes.NUMBER
	}
}, { sequelize, tableName: 'slow-mode-threshold' });

SlowMode.hasMany(SlowModeStage, { as: 'stages' });
SlowModeStage.belongsTo(SlowMode);