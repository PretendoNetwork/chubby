import { getDB, getDBList } from '@/db';
import { ChannelType } from 'discord.js';
import type { Channel, EmbedBuilder, Guild, Role, Message, APIApplicationCommandOptionChoice } from 'discord.js';

const ordinalRules = new Intl.PluralRules('en', {
	type: 'ordinal'
});

const suffixes: Record<string, string> = {
	one: 'st',
	two: 'nd',
	few: 'rd',
	other: 'th'
};

export const banMessageDeleteChoices: Array<APIApplicationCommandOptionChoice<number>> = [
	{ name: 'Previous 30 Minutes', value: 30 * 60 },
	{ name: 'Previous Hour', value: 60 * 60 },
	{ name: 'Previous 3 Hours', value: 3 * 60 * 60 },
	{ name: 'Previous 6 Hours', value: 6 * 60 * 60 },
	{ name: 'Previous 12 Hours', value: 12 * 60 * 60 },
	{ name: 'Previous Day', value: 24 * 60 * 60 },
	{ name: 'Previous 3 Days', value: 3 * 24 * 60 * 60 },
	{ name: 'Previous Week', value: 7 * 24 * 60 * 60 },
];

export function ordinal(number: number): string {
	const category = ordinalRules.select(number);
	const suffix = suffixes[category];
	return (number + suffix);
}

export async function sendEventLogMessage(guild: Guild, originId: string | null, embed: EmbedBuilder, content?: string): Promise<Message | null> {
	const blacklistedIds = getDBList('channels.event-logs.blacklist');
	if (originId && blacklistedIds.includes(originId)) {
		return null;
	}

	const logChannel = await getChannelFromSettings(guild, 'channels.event-logs');
	if (!logChannel || logChannel.type !== ChannelType.GuildText) {
		console.log('Missing log channel!');
		return null;
	}

	return logChannel.send({ content, embeds: [embed] });
}

export async function sendModLogMessage(guild: Guild, embed: EmbedBuilder, content?: string): Promise<Message | null> {
	const logChannel = await getChannelFromSettings(guild, 'channels.mod-logs');
	if (!logChannel || logChannel.type !== ChannelType.GuildText) {
		console.log('Missing mod log channel!');
		return null;
	}

	return logChannel.send({ content, embeds: [embed] });
}

export async function getChannelFromSettings(guild: Guild, channelName: string): Promise<Channel | null> {
	const channelID = getDB().get(channelName);
	if (!channelID) {
		console.log(`No channel id set for ${channelName}`);
		return null;
	}

	const channel = await guild.channels.fetch(channelID);
	if (!channel) {
		console.log(`Channel id ${channelID} does not exist in guild ${guild.id}`);
		return null;
	}

	return channel;
}

export async function getRoleFromSettings(guild: Guild, roleName: string): Promise<Role | null> {
	const roleID = getDB().get(roleName);
	if (!roleID) {
		console.log(`No role id set for ${roleName}`);
		return null;
	}

	const role = await guild.roles.fetch(roleID);
	if (!role) {
		console.log(`Role id ${roleID} does not exist in guild ${guild.id}`);
		return null;
	}

	return role;
}
