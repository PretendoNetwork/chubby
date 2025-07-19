import { DataTypes, Model } from 'sequelize';
import { z } from 'zod';
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
	inputPreprocess?: (input: string) => any;
};

const settingsCache = new Map<SettingsKeys, any>();

const snowflakeSchema = z.string().min(17).max(20).regex(/^\d+$/, 'Invalid snowflake format');

const settingsDefaults = {
	'roles.mod-ping-allowed': [] as string[],
	'event-logs.channel-blacklist': [] as string[],
	'leveling.enabled': false,
	'matchmaking.lock-timeout-seconds': 300,
	'leveling.channel-blacklist': [] as string[],
	'leveling.message-xp': 1,
	'leveling.xp-required-for-trusted': 1000,
	'leveling.days-required-for-trusted': 30,
	'leveling.supporter-xp-multiplier': 1,
	'leveling.message-timeout-seconds': 60
} as const satisfies Record<string, any>;

export const settingsDefinitions = {
	'role.muted': { schema: snowflakeSchema },
	'role.supporter': { schema: snowflakeSchema },
	'role.trusted': { schema: snowflakeSchema },
	'role.untrusted': { schema: snowflakeSchema },
	'role.mod-ping': { schema: snowflakeSchema },
	'roles.mod-ping-allowed': { schema: z.array(snowflakeSchema).default(settingsDefaults['roles.mod-ping-allowed']), inputPreprocess: (s): string[] => s.split(',') },
	'channel.event-logs': { schema: snowflakeSchema },
	'channel.matchmaking': { schema: snowflakeSchema },
	'channel.notifications': { schema: snowflakeSchema },
	'event-logs.channel-blacklist': { schema: z.array(snowflakeSchema).default(settingsDefaults['event-logs.channel-blacklist']), inputPreprocess: (s): string[] => s.split(',') },
	'matchmaking.lock-timeout-seconds': { schema: z.coerce.number().min(1).default(settingsDefaults['matchmaking.lock-timeout-seconds']) },
	'leveling.enabled': { schema: z.boolean().default(settingsDefaults['leveling.enabled']), inputPreprocess: (s): boolean | string => typeof s === 'string' && ['true', 'false'].includes(s) ? Boolean(s) : s },
	'leveling.channel-blacklist': { schema: z.array(snowflakeSchema).default(settingsDefaults['leveling.channel-blacklist']), inputPreprocess: (s): string[] => s.split(',') },
	'leveling.message-xp': { schema: z.coerce.number().gt(0).default(settingsDefaults['leveling.message-xp']) },
	'leveling.xp-required-for-trusted': { schema: z.coerce.number().min(1).default(settingsDefaults['leveling.xp-required-for-trusted']) },
	'leveling.days-required-for-trusted': { schema: z.coerce.number().min(0).default(settingsDefaults['leveling.days-required-for-trusted']) },
	'leveling.supporter-xp-multiplier': { schema: z.coerce.number().min(1).default(settingsDefaults['leveling.supporter-xp-multiplier']) },
	'leveling.message-timeout-seconds': { schema: z.coerce.number().min(1).default(settingsDefaults['leveling.message-timeout-seconds']) }
} satisfies Record<string, SettingSchema>;

export type SettingsDefinitions = typeof settingsDefinitions;
export type SettingsKeys = keyof SettingsDefinitions;

type ZodTypeOrDefault<T extends z.ZodTypeAny> =
	T extends z.ZodDefault<infer U> ? z.output<U> :
	z.output<T> | null;

export async function getSetting<T extends SettingsKeys>(key: T): Promise<ZodTypeOrDefault<SettingsDefinitions[T]['schema']>> {
	assertValidSettingKey(key);

	if (settingsCache.has(key)) {
		return settingsCache.get(key);
	}

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
		settingsCache.set(key, parsedValue);
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

		// Refresh the cache when fetching all settings
		settingsCache.set(setting.key as SettingsKeys, result[setting.key]);
	}
	return result;
}

type GetSettingDefault<T extends SettingsKeys> =
	T extends SettingsKeys
		? T extends keyof typeof settingsDefaults
			? typeof settingsDefaults[T]
			: null
		: never;

export function getSettingDefault<T extends SettingsKeys>(key: T): GetSettingDefault<T> {
	const definition = settingsDefinitions[key];
	if (!definition) {
		throw new Error(`No setting definition found for key: ${key}`);
	}

	if (definition.schema._def.typeName === 'ZodDefault') {
		return definition.schema._def.defaultValue() as any;
	}

	return null as any;
}

export async function initialiseSettings(): Promise<void> {
	for (const key of Object.keys(settingsDefinitions) as SettingsKeys[]) {
		const defaultValue = getSettingDefault(key);
		const existingSetting = await Settings.findOne({ where: { key } });
		if (existingSetting) {
			// Pre-warm the cache
			settingsCache.set(key, existingSetting.value != null ? JSON.parse(existingSetting.value) : null);
			continue;
		}

		const newSetting = await Settings.create({
			key,
			value: defaultValue !== null ? JSON.stringify(defaultValue) : null
		});

		// Pre-warm the cache
		settingsCache.set(key, newSetting.value != null ? JSON.parse(newSetting.value) : null);
	}
}
