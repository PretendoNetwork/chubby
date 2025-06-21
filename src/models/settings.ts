import { DataTypes, Model } from 'sequelize';
import { z } from 'zod';
import { zodCoercedBoolean } from '@neato/config';
import { sequelize } from '@/sequelize-instance';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';

class Settings extends Model<InferAttributes<Settings>, InferCreationAttributes<Settings>> {
	declare key: string;
	declare value: string | null;
}

Settings.init({
	key: {
		type: DataTypes.STRING,
		primaryKey: true
	},
	value: {
		type: DataTypes.STRING,
		allowNull: true
	}
}, {
	sequelize,
	tableName: 'settings'
});

type SettingSchema = {
	schema: z.ZodTypeAny;
};

const snowflakeSchema = z.string().min(17).max(20).regex(/^\d+$/);

export const settingsDefinitions = {
	'nsfw.enabled': { schema: zodCoercedBoolean().default(false) },
	'nsfw.threshold.high': { schema: z.number().min(0).default(1) },
	'nsfw.threshold.low': { schema: z.number().min(0).default(0.7) },
	'nsfw.exemption.distance': { schema: z.number().min(0).default(0) },
	'role.muted': { schema: snowflakeSchema },
	'role.nsfw-punished': { schema: snowflakeSchema },
	'role.supporter': { schema: snowflakeSchema },
	'role.trusted': { schema: snowflakeSchema },
	'role.untrusted': { schema: snowflakeSchema },
	'role.mod-ping': { schema: snowflakeSchema },
	'roles.mod-ping-allowed': { schema: z.array(snowflakeSchema).default([]) },
	'channel.nsfw-punished': { schema: snowflakeSchema },
	'channel.nsfw-logs': { schema: snowflakeSchema },
	'channel.event-logs': { schema: snowflakeSchema },
	'channel.matchmaking': { schema: snowflakeSchema },
	'channel.notifications': { schema: snowflakeSchema },
	'event-logs.blacklist': { schema: z.array(snowflakeSchema).default([]) },
	'matchmaking.lock-timeout-seconds': { schema: z.number().min(1).default(300) },
	'leveling.channels-blacklist': { schema: z.array(z.string()).default([]) },
	'leveling.xp-required-for-trusted': { schema: z.number().min(1).default(1000) },
	'leveling.days-required-for-trusted': { schema: z.number().min(0).default(30) },
	'leveling.supporter-xp-multiplier': { schema: z.number().min(1).default(1) },
	'leveling.message-timeout-seconds': { schema: z.number().min(1).default(60) }
} satisfies Record<string, SettingSchema>;

export type SettingsDefinitions = typeof settingsDefinitions;
export type SettingsKeys = keyof SettingsDefinitions;

type ZodTypeOrDefault<T extends z.ZodTypeAny> =
	T extends z.ZodDefault<infer U> ? z.output<U> :
	z.output<T> | null;

export async function getSetting<T extends SettingsKeys>(key: T): Promise<ZodTypeOrDefault<SettingsDefinitions[T]['schema']>> {
	assertValidSettingKey(key);

	const setting = await Settings.findOne({ where: { key } });

	if (setting == null) {
		throw new Error(`Setting not found for key: ${key}`);
	}

	return setting.value != null ? JSON.parse(setting.value) : null as any;
}

function assertValidSettingKey<T extends keyof SettingsDefinitions>(key: T): asserts key is T {
	if (!(key in settingsDefinitions)) {
		throw new Error(`Invalid setting key: ${key}`);
	}
}

export async function setSetting<T extends SettingsKeys>(key: T, value: z.input<SettingsDefinitions[T]['schema']>): Promise<{ success: true } | { success: false; error: Error | null }> {
	assertValidSettingKey(key);
	const definition = settingsDefinitions[key];

	try {
		const parsedValue = definition.schema.parse(value);
		await Settings.upsert({
			key,
			value: JSON.stringify(parsedValue)
		});
		return { success: true };
	} catch (error) {
		if (error instanceof Error) {
			return { success: false, error };
		}

		return { success: false, error: null };
	}
}

export async function getAllSettings(): Promise<Record<string, any>> {
	const settings = await Settings.findAll();
	const result: any = {};
	for (const setting of settings) {
		if (!(setting.key in settingsDefinitions)) {
			continue;
		}
		result[setting.key] = setting.value != null ? JSON.parse(setting.value) : null;
	}
	return result;
}

export function getSettingDefault<T extends SettingsKeys>(key: T): SettingsDefinitions[T]['schema'] extends z.ZodDefault<infer U> ? z.output<U> : undefined {
	const definition = settingsDefinitions[key];
	if (!definition) {
		throw new Error(`No setting definition found for key: ${key}`);
	}

	if (definition.schema._def.typeName === 'ZodDefault') {
		return definition.schema._def.defaultValue() as any;
	}

	return undefined as any;
}

export async function initialiseSettings(): Promise<void> {
	for (const key of Object.keys(settingsDefinitions) as SettingsKeys[]) {
		const definition = settingsDefinitions[key];
		if (definition.schema._def.typeName === 'ZodDefault') {
			const defaultValue = definition.schema._def.defaultValue();
			Settings.upsert({
				key,
				value: JSON.stringify(defaultValue)
			});
		} else {
			Settings.upsert({
				key,
				value: null
			});
		}
	}
}
