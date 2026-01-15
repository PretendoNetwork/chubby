import { ChannelType, EmbedBuilder } from 'discord.js';
import { getSetting } from '@/models/settings';
import type { SettingsKeys } from '@/models/settings';
import type { Channel, Guild, Role, Message, APIApplicationCommandOptionChoice, GuildMember } from 'discord.js';

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
	{ name: 'Previous Week', value: 7 * 24 * 60 * 60 }
];

export function ordinal(number: number): string {
	const category = ordinalRules.select(number);
	const suffix = suffixes[category];
	return (number + suffix);
}

export async function sendEventLogMessage(guild: Guild, originId: string | null, embed: EmbedBuilder, content?: string): Promise<Message | null> {
	const blacklistedIds = await getSetting('event-logs.channel-blacklist');
	if (originId && blacklistedIds.includes(originId)) {
		return null;
	}

	const logChannel = await getChannelFromSettings(guild, 'event-logs');
	if (!logChannel || logChannel.type !== ChannelType.GuildText) {
		console.log('Missing log channel!');
		return null;
	}

	return logChannel.send({ content, embeds: [embed] });
}

type RoleKeys = Extract<SettingsKeys, `role.${string}`> extends `role.${infer R}` ? R : never;
type ChannelKeys = Extract<SettingsKeys, `channel.${string}`> extends `channel.${infer C}` ? C : never;

export async function getChannelFromSettings(guild: Guild, channelName: ChannelKeys): Promise<Channel | null> {
	const channelID = await getSetting(`channel.${channelName}`);
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

export async function getRoleFromSettings(guild: Guild, roleName: RoleKeys): Promise<Role | null> {
	const roleID = await getSetting(`role.${roleName}`);
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

export interface ModerationAction {
	permitted: boolean;
	disallowedUsers: string[];
}

export async function canActOnUserList(actor: GuildMember, userIDs: string[]): Promise<ModerationAction> {
	// user ids of people the executor can't act upon
	const res: ModerationAction = {
		permitted: true,
		disallowedUsers: []
	};

	// check that the executor has sufficient perms to act upon all the listed users, before running the command
	for (const userID of userIDs) {
		const acted = await actor.guild.members.fetch(userID);
		const roleA = actor.roles.highest;
		const roleB = acted.roles.highest;
		const posDiff = roleA.comparePositionTo(roleB);

		const permitted = posDiff >= 1;

		if (!permitted) {
			res.permitted = false;
			res.disallowedUsers.push(userID);
		}
	}

	return res;
}

export async function createNoPermissionEmbed(modAction: ModerationAction): Promise<EmbedBuilder> {
	const commandFailedEmbed = new EmbedBuilder();
	commandFailedEmbed.setTitle('Unable to run command');
	commandFailedEmbed.setColor(0xFFA500);
	commandFailedEmbed.setDescription(`${modAction.disallowedUsers.length} of the users you tried to act upon ha${modAction.disallowedUsers.length === 1 ? 's' : 've'} the same or a higher rank than you.\nThe command has **not** been run.`);
	modAction.disallowedUsers.forEach((p) => {
		commandFailedEmbed.addFields({
			name: `ID: \`${p}\``,
			value: `<@${p}>`
		});
	});

	return commandFailedEmbed;
}
