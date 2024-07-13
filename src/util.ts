import { getDB, getDBList } from '@/db';
import { ChannelType } from 'discord.js';
import type { EmbedBuilder, Guild } from 'discord.js';

const ordinalRules = new Intl.PluralRules('en', {
	type: 'ordinal'
});

const suffixes: Record<string, string> = {
	one: 'st',
	two: 'nd',
	few: 'rd',
	other: 'th'
};

export function ordinal(number: number): string {
	const category = ordinalRules.select(number);
	const suffix = suffixes[category];
	return (number + suffix);
}

export async function sendEventLogMessage(guild: Guild, originId: string | null, embed: EmbedBuilder): Promise<void> {
	const blacklistedIds = getDBList('channels.event-logs.blacklist');
	if (originId && blacklistedIds.includes(originId)) {
		return;
	}

	const logChannelId = getDB().get('channels.event-logs');
	if (!logChannelId) {
		console.log('Missing log channel!');
		return;
	}

	const logChannel = await guild.channels.fetch(logChannelId);
	
	if (!logChannel || logChannel.type !== ChannelType.GuildText) {
		console.log('Missing log channel!');
		return;
	}

	await logChannel.send({ embeds: [embed] });
}
