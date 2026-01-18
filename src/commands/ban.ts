import { EmbedBuilder, InteractionContextType } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Ban } from '@/models/bans';
import { banMessageDeleteChoices, sendEventLogMessage, canActOnUserList, createNoPermissionEmbed } from '@/util';
import { untrustUser } from '@/leveling';
import { notifyUser } from '@/notifications';
import type { ChatInputCommandInteraction, CommandInteraction, ModalSubmitInteraction, GuildMember } from 'discord.js';

async function banCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	const subcommand = interaction.options.getSubcommand();
	const reason = interaction.options.getString('reason', true);
	const deleteMessages = interaction.options.getNumber('delete_messages');

	let userIDs;
	if (subcommand === 'user') {
		const user = interaction.options.getUser('user', true);
		userIDs = [user.id];
	} else if (subcommand === 'multiuser') {
		const users = interaction.options.getString('users', true);
		userIDs = [...new Set(Array.from(users.matchAll(/\d{17,19}/g), match => match[0]))];
	} else {
		throw new Error(`Unknown ban subcommand: ${subcommand}`);
	}

	await banHandler(interaction, userIDs, reason, deleteMessages);
}

export async function banHandler(interaction: CommandInteraction | ModalSubmitInteraction, userIDs: string[], reason: string, deleteMessages?: number | null): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild!.fetch();
	const executor = interaction.user;

	const bansListEmbed = new EmbedBuilder();
	bansListEmbed.setTitle('User Bans :thumbsdown:');
	bansListEmbed.setColor(0xFFA500);

	const action = await canActOnUserList(interaction.member as GuildMember, userIDs);

	if (!action.permitted) {
		const actionNotPermittedEmbed = await createNoPermissionEmbed(action);

		await interaction.followUp({ embeds: [actionNotPermittedEmbed], ephemeral: true });

		return;
	}

	for (const userID of userIDs) {
		const member = await guild.members.fetch(userID);
		const user = member.user;

		await untrustUser(member, interaction.createdAt);

		const eventLogEmbed = new EmbedBuilder();

		eventLogEmbed.setColor(0xF24E43);
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('Event Type: _Member Banned_');
		eventLogEmbed.setFields(
			{
				name: 'User',
				value: `<@${user.id}>`
			},
			{
				name: 'User ID',
				value: user.id
			},
			{
				name: 'Executor',
				value: `<@${executor.id}>`
			},
			{
				name: 'Executor User ID',
				value: executor.id
			},
			{
				name: 'Reason',
				value: reason
			},
			{
				name: 'Delete Messages (seconds)',
				value: deleteMessages?.toString() ?? 'No'
			},
			{
				name: 'From bot /ban command',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		await sendEventLogMessage(guild, null, eventLogEmbed);

		const { count } = await Ban.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		const sendMemberEmbeds = [];

		const banEmbed = new EmbedBuilder();

		banEmbed.setTitle('Punishment Details');
		banEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
		banEmbed.setColor(0xF24E43);
		banEmbed.setTimestamp(Date.now());
		banEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});
		banEmbed.setFields({
			name: 'Ban Reason',
			value: reason
		});

		sendMemberEmbeds.push(banEmbed);

		await notifyUser(guild, user, {
			embeds: sendMemberEmbeds
		});

		await member.ban({
			reason: reason,
			deleteMessageSeconds: deleteMessages ?? undefined
		});

		await Ban.create({
			user_id: member.id,
			admin_user_id: executor.id,
			reason: reason
		});

		bansListEmbed.addFields([
			{ name: `${member.user.username}'s bans`, value: (count + 1).toString(), inline: true }
		]);
	}

	await interaction.followUp({ embeds: [bansListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('ban')
	.setDescription('Ban user(s)')
	.setContexts([InteractionContextType.Guild])
	.addSubcommand(subcommand =>
		subcommand.setName('user')
			.setDescription('Ban a single user')
			.addUserOption(option =>
				option.setName('user')
					.setDescription('User to ban')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('reason')
					.setDescription('Reason for the ban')
					.setRequired(true))
			.addNumberOption(option =>
				option.setName('delete_messages')
					.setDescription('How much of their recent message history to delete')
					.addChoices(banMessageDeleteChoices))
	)
	.addSubcommand(subcommand =>
		subcommand.setName('multiuser')
			.setDescription('Ban multiple users')
			.addStringOption(option =>
				option.setName('users')
					.setDescription('User(s) to ban')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('reason')
					.setDescription('Reason for the ban')
					.setRequired(true))
			.addNumberOption(option =>
				option.setName('delete_messages')
					.setDescription('How much of their recent message history to delete')
					.addChoices(banMessageDeleteChoices))
	);

export default {
	name: command.name,
	handler: banCommandHandler,
	deploy: command.toJSON()
};
