import { EmbedBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { User } from '@/models/users';
import { Warning } from '@/models/warnings';
import { getSetting } from '@/models/settings';
import type { ChatInputCommandInteraction, GuildMemberRoleManager } from 'discord.js';

export async function userInfoCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const member = interaction.member;

	if (!member || !interaction.guild) {
		return;
	}

	const { rows } = await Warning.findAndCountAll({
		where: {
			user_id: member.user.id
		}
	});
	const userWarnings = rows.map(v => ({
		content: v,
		isExpired: v.expires_at && v.expires_at < new Date()
	}));
	const activeWarnings = userWarnings.filter(v => !v.isExpired);

	const [user] = await User.findOrCreate({
		where: {
			user_id: member.user.id
		}
	});

	const levelingEnabled = await getSetting('leveling.enabled');
	const minimumXP = await getSetting('leveling.xp-required-for-trusted');
	const daysRequiredForTrusted = await getSetting('leveling.days-required-for-trusted');
	const messageXP = await getSetting('leveling.message-xp');
	const messageTimeout = await getSetting('leveling.message-timeout-seconds');
	const trustedRole = await getSetting('role.trusted');
	const untrustedRole = await getSetting('role.untrusted');

	const now = new Date();

	const userInfoEmbed = new EmbedBuilder();
	userInfoEmbed.setTitle('User info');
	userInfoEmbed.setColor(0x9D6FF3);
	userInfoEmbed.setAuthor({ name: member.user.username, iconURL: interaction.user.displayAvatarURL() });

	if (!levelingEnabled || !trustedRole) {
		userInfoEmbed.setDescription(activeWarnings ? `**Warnings (${activeWarnings.length}):**\n` : '**No active warnings.**');
	} else if (untrustedRole && (member.roles as GuildMemberRoleManager).cache.has(untrustedRole)) {
		userInfoEmbed.setDescription(`You have <@&${untrustedRole}>. You cannot earn XP.\n\n${activeWarnings ? `**Warnings (${activeWarnings.length}):**\n` : '**No active warnings.**'}`);
	} else if ((member.roles as GuildMemberRoleManager).cache.has(trustedRole)) {
		userInfoEmbed.setDescription(`You have <@&${trustedRole}>.\n\n${activeWarnings ? `**Warnings (${activeWarnings.length}):**\n` : '**No active warnings.**'}`);
	} else if (user.trusted_time_start_date) {
		let seconds = Math.floor((now.getTime() - user.trusted_time_start_date.getTime()) / 1000);

		const days = Math.floor(seconds / 86400);
		seconds -= days * 86400;

		const hours = Math.floor(seconds / 3600) % 24;
		seconds -= hours * 3600;

		const minutes = Math.floor(seconds / 60) % 60;
		seconds -= minutes * 60;

		userInfoEmbed.setDescription(`**Experience (XP)**: ${user.xp} / ${minimumXP} XP
			**Time Earning XP**: ${days}d, ${hours}h, ${minutes}m / ${daysRequiredForTrusted} days
			
			Note: to earn <@&${trustedRole}>, there are two requirements that both need to be met:

			**Experience (XP)**
			• ${minimumXP} XP (${messageXP} XP per message, with ${messageTimeout}sec cooldown between XP earnings; some channels blacklisted)

			**Time Earning XP**
			• ${daysRequiredForTrusted} day${daysRequiredForTrusted !== 1 && 's'} since joining the server OR since last untrust event (whichever is more recent)
			
			${activeWarnings ? `**Warnings (${activeWarnings.length}):**\n` : '**No active warnings.**'}`);
	} else {
		userInfoEmbed.setDescription(`You have not interacted with the community yet.
			
			Note: to earn <@&${trustedRole}>, there are two requirements that both need to be met:

			**Experience (XP)**
			• ${minimumXP} XP (${messageXP} XP per message, with ${messageTimeout}sec cooldown between XP earnings; some channels blacklisted)

			**Time Earning XP**
			• ${daysRequiredForTrusted} day${daysRequiredForTrusted !== 1 && 's'} since joining the server OR since last untrust event (whichever is more recent)
			
			${activeWarnings ? `**Warnings (${activeWarnings.length}):**\n` : '**No active warnings.**'}`);
	}

	activeWarnings.forEach((warn) => {
		userInfoEmbed.addFields({
			name: `${warn.content.timestamp.toLocaleDateString()}: (ID: \`${warn.content.id}\`)` + (warn.isExpired ? ' - EXPIRED' : ''),
			value: warn.content.reason
		});
	});

	await interaction.followUp({ embeds: [userInfoEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('user-info')
	.setDescription('View moderation info about yourself');

export default {
	name: command.name,
	handler: userInfoCommandHandler,
	deploy: command.toJSON()
};
