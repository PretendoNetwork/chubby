import { EmbedBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Warning } from '@/models/warnings';
import type { ChatInputCommandInteraction, CommandInteraction } from 'discord.js';

async function manageWarnCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'view') {
		const user = interaction.options.getUser('user', true);
		await viewWarnHandler(interaction, user.id);
		return;
	} else if (subcommand === 'remove') {
		const warnId = interaction.options.getString('id', true);
		await removeWarnHandler(interaction, warnId);
		return;
	}

	throw new Error(`Unknown warn subcommand: ${subcommand}`);
}

export async function viewWarnHandler(interaction: CommandInteraction, userId: string): Promise<void> {
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
		warningListEmbed.addFields({
			name: `Warning ID: \`${warn.content.id}\`` + (warn.isExpired ? ' - EXPIRED' : ''),
			value: warn.content.reason + `\n---\nGiven on ${warn.content.timestamp.toLocaleDateString()} by <@${warn.content.admin_user_id}>`
		});
	});

	await interaction.followUp({ embeds: [warningListEmbed], ephemeral: true });
}

export async function removeWarnHandler(interaction: CommandInteraction, warnId: string): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const warning = await Warning.findOne({
		where: {
			id: Number(warnId)
		}
	});

	if (!warning) {
		await interaction.followUp({ content: 'Could not find warning', ephemeral: true });
		return;
	}

	const [affectedUpdates] = await Warning.update({
		expires_at: new Date()
	}, {
		where: {
			id: Number(warnId)
		}
	});
	if (affectedUpdates < 1) {
		await interaction.followUp({ content: 'Failed to remove warning', ephemeral: true });
		return;
	}

	await interaction.followUp({ content: 'Successfully removed warning', ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('manage-warn')
	.setDescription('Manage warns for users')
	.addSubcommand((subcommand) => {
		return subcommand.setName('view')
			.setDescription('View warns of a user')
			.addUserOption((option) => {
				return option.setName('user')
					.setDescription('User view warns for')
					.setRequired(true);
			});
	})
	.addSubcommand((subcommand) => {
		return subcommand.setName('remove')
			.setDescription('Remove a warning')
			.addStringOption((option) => {
				return option.setName('id')
					.setDescription('Warning to remove')
					.setRequired(true);
			});
	});

export default {
	name: command.name,
	handler: manageWarnCommandHandler,
	deploy: command.toJSON()
};
