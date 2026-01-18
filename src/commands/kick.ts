import { EmbedBuilder, InteractionContextType } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Kick } from '@/models/kicks';
import { Ban } from '@/models/bans';
import { banMessageDeleteChoices, sendEventLogMessage, canActOnUserList, createNoPermissionEmbed } from '@/util';
import { untrustUser } from '@/leveling';
import { notifyUser } from '@/notifications';
import type { ChatInputCommandInteraction, CommandInteraction, ModalSubmitInteraction, GuildMember } from 'discord.js';

async function kickCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
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
		throw new Error(`Unknown kick subcommand: ${subcommand}`);
	}

	await kickHandler(interaction, userIDs, reason, deleteMessages);
}

export async function kickHandler(interaction: CommandInteraction | ModalSubmitInteraction, userIDs: string[], reason: string, deleteMessages?: number | null): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild!.fetch();
	const executor = interaction.user;

	const kicksListEmbed = new EmbedBuilder();
	kicksListEmbed.setTitle('User Kicks :thumbsdown:');
	kicksListEmbed.setColor(0xFFA500);

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

		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setTimestamp(Date.now());
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
				name: 'From bot /kick command',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		const { count } = await Kick.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		let isKick;
		let isBan;

		const sendMemberEmbeds = [];

		if (count >= 2) { // Atleast 2 previous kicks, this would be the 3rd strike. Ban
			eventLogEmbed.setColor(0xF24E43);
			eventLogEmbed.setTitle('Event Type: _Member Banned_');

			const banEmbed = new EmbedBuilder();

			banEmbed.setTitle('Punishment Details');
			banEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
			banEmbed.setColor(0xF24E43);
			banEmbed.setTimestamp(Date.now());
			banEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			banEmbed.setFields(
				{
					name: 'Ban Reason',
					value: reason
				},
				{
					name: 'From kick',
					value: 'This ban was the result of being kicked 3 times. Below is a list of all previous kicks'
				}
			);

			isBan = true;

			sendMemberEmbeds.push(banEmbed);
		} else { // Just kick
			eventLogEmbed.setColor(0xEF7F31);
			eventLogEmbed.setTitle('Event Type: _Member Kicked_');

			const kickEmbed = new EmbedBuilder();

			kickEmbed.setTitle('Punishment Details');
			kickEmbed.setDescription('You have been kicked from the Pretendo Network server. You may rejoin after reviewing the details of the kick below');
			kickEmbed.setColor(0xEF7F31);
			kickEmbed.setTimestamp(Date.now());
			kickEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			kickEmbed.setFields({
				name: 'Kick Reason',
				value: reason
			});

			isKick = true;

			sendMemberEmbeds.push(kickEmbed);
		}

		await sendEventLogMessage(guild, null, eventLogEmbed);

		await notifyUser(guild, user, {
			embeds: sendMemberEmbeds
		});

		if (isKick) {
			if (deleteMessages) {
				await member.ban({
					reason: `Kick with message deletion: ${reason}`,
					deleteMessageSeconds: deleteMessages ?? undefined
				});
				await guild.members.unban(member, 'Remove ban for kick with message deletion');
			} else {
				await member.kick(reason);
			}
		} else if (isBan) {
			await member.ban({
				reason,
				deleteMessageSeconds: deleteMessages ?? undefined
			});

			await Ban.create({
				user_id: member.id,
				admin_user_id: executor.id,
				reason: reason,
				from_kick: true
			});
		} else {
			// ???
		}

		await Kick.create({
			user_id: member.id,
			admin_user_id: executor.id,
			reason: reason
		});

		kicksListEmbed.addFields([
			{ name: `${member.user.username}'s kicks`, value: (count + 1).toString(), inline: true }
		]);
	}

	await interaction.followUp({ embeds: [kicksListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('kick')
	.setDescription('Kick user(s)')
	.setContexts([InteractionContextType.Guild])
	.addSubcommand(subcommand =>
		subcommand.setName('user')
			.setDescription('Kick user')
			.addUserOption(option =>
				option.setName('user')
					.setDescription('User to kick')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('reason')
					.setDescription('Reason for the kick')
					.setRequired(true))
			.addNumberOption(option =>
				option.setName('delete_messages')
					.setDescription('How much of their recent message history to delete')
					.addChoices(banMessageDeleteChoices))
	)
	.addSubcommand(subcommand =>
		subcommand.setName('multiuser')
			.setDescription('Kick multiple users')
			.addStringOption(option =>
				option.setName('users')
					.setDescription('User(s) to kick')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('reason')
					.setDescription('Reason for the kick')
					.setRequired(true))
			.addNumberOption(option =>
				option.setName('delete_messages')
					.setDescription('How much of their recent message history to delete')
					.addChoices(banMessageDeleteChoices))
	);

export default {
	name: command.name,
	handler: kickCommandHandler,
	deploy: command.toJSON()
};
