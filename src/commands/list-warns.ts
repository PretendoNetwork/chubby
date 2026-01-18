import { EmbedBuilder, InteractionContextType } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Warning } from '@/models/warnings';
import type { ChatInputCommandInteraction } from 'discord.js';

export async function listWarnsCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	const { id: userId } = interaction.options.getUser('user', true);

	await interaction.deferReply({
		ephemeral: true
	});

	const member = await interaction.guild!.members.fetch(userId);

	const { rows } = await Warning.findAndCountAll({
		where: {
			user_id: member.id
		}
	});
	const userWarnings = rows.map(v => ({
		content: v,
		isExpired: v.expires_at && v.expires_at < new Date()
	}));
	const activeWarnings = userWarnings.filter(v => !v.isExpired);

	const warningListEmbed = new EmbedBuilder();
	warningListEmbed.setTitle('Warning list :thumbsdown:');
	warningListEmbed.setColor(0xFFA500);
	warningListEmbed.setDescription(`Showing warnings for <@${member.user.id}>\nTotal warnings: ${activeWarnings.length}`);

	userWarnings.forEach((warn) => {
		const t = Math.floor(warn.content.timestamp.getTime() / 1000);

		warningListEmbed.addFields({
			name: `Warning ID: \`${warn.content.id}\`` + (warn.isExpired ? ' - EXPIRED' : ''),
			value: warn.content.reason + `\n---\nGiven at <t:${t}:S> by <@${warn.content.admin_user_id}>`
		});
	});

	await interaction.followUp({ embeds: [warningListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('list-warns')
	.setDescription('View a user\'s warns')
	.setContexts([InteractionContextType.Guild])
	.addUserOption((option) => {
		return option.setName('user')
			.setDescription('User whose warn history will be displayed')
			.setRequired(true);
	});

export default {
	name: command.name,
	handler: listWarnsCommandHandler,
	deploy: command.toJSON()
};
