import { ApplicationIntegrationType, EmbedBuilder, InteractionContextType } from 'discord.js';
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
	const user = interaction.user;
	const [dbUser] = await User.findOrCreate({
		where: {
			user_id: user.id
		}
	});
	const inDMs = !member || interaction.context === InteractionContextType.BotDM;

	const { rows } = await Warning.findAndCountAll({
		where: {
			user_id: user.id
		}
	});
	const userWarnings = rows.map(v => ({
		content: v,
		isExpired: v.expires_at && v.expires_at < new Date()
	}));
	const activeWarnings = userWarnings.filter(v => !v.isExpired);

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
	userInfoEmbed.setAuthor({ name: user.username, iconURL: interaction.user.displayAvatarURL() });

	let userInfoDesc = '';
	const _warningsText = activeWarnings.length > 0 ? `**<:mod:1462244578118729952> Warnings (${activeWarnings.length}):**\n` : '**<:mod:1462244578118729952> No warnings.**';

	if (inDMs) {
		userInfoDesc = _warningsText;
		userInfoEmbed.setFooter({ text: 'Note: to see your current XP, run this command in the server.' });
	} else if (!levelingEnabled || !trustedRole) {
		userInfoDesc = _warningsText;
	} else if (untrustedRole && (member.roles as GuildMemberRoleManager).cache.has(untrustedRole)) {
		userInfoDesc = `You have <@&${untrustedRole}>. You cannot earn XP.\n\n${_warningsText}`;
	} else if ((member.roles as GuildMemberRoleManager).cache.has(trustedRole)) {
		userInfoDesc = `<:trusted:1462263739670728798> You have <@&${trustedRole}>.\n\n${_warningsText}`;
	} else if (dbUser.trusted_time_start_date) {
		let seconds = Math.floor((now.getTime() - dbUser.trusted_time_start_date.getTime()) / 1000);

		const days = Math.floor(seconds / 86400);
		seconds -= days * 86400;

		const hours = Math.floor(seconds / 3600) % 24;
		seconds -= hours * 3600;

		const minutes = Math.floor(seconds / 60) % 60;
		seconds -= minutes * 60;

		userInfoDesc = `You currently don't have <@&${trustedRole}>. You must meet both requirements:\n\n${dbUser.xp < minimumXP ? '<:disallow:1462263736902488064>' : '<:allow:1462263738353586197>'} **${dbUser.xp}** / ${minimumXP} XP\n-# (${messageXP} XP / msg, ${messageTimeout}s cooldown between msgs, some channels blacklisted)\n${Math.floor((now.getTime() - dbUser.trusted_time_start_date.getTime()) / 1000) < daysRequiredForTrusted * 24 * 60 * 60 ? '<:disallow:1462263736902488064>' : '<:allow:1462263738353586197>'} In server for **${days}d ${hours}h ${minutes}m** / ${daysRequiredForTrusted} days\n-# (after joining / having Trusted removed)\n\n${_warningsText}`;
	} else {
		userInfoDesc = `You have not interacted with the community yet.\n\n${_warningsText}`;
	}

	userInfoEmbed.setDescription(userInfoDesc);

	activeWarnings.forEach((warn) => {
		const t = Math.floor(warn.content.timestamp.getTime() / 1000);

		userInfoEmbed.addFields({
			name: `<t:${t}:S> (ID: \`${warn.content.id}\`):`,
			value: warn.content.reason
		});
	});

	await interaction.followUp({ embeds: [userInfoEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setName('user-info')
	.setContexts([InteractionContextType.BotDM, InteractionContextType.Guild])
	.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
	.setDescription('View moderation info about yourself');

export default {
	name: command.name,
	handler: userInfoCommandHandler,
	deploy: command.toJSON()
};
