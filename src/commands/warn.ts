import { EmbedBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Warning } from '@/models/warnings';
import { Kick } from '@/models/kicks';
import { Ban } from '@/models/bans';
import { ordinal, sendModLogMessage } from '@/util';
import { untrustUser } from '@/leveling';
import { notifyUser } from '@/notifications';
import type { ChatInputCommandInteraction, CommandInteraction, ModalSubmitInteraction } from 'discord.js';

async function warnCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	const subcommand = interaction.options.getSubcommand();
	const reason = interaction.options.getString('reason', true);

	let userIDs;
	if (subcommand === 'user') {
		const user = interaction.options.getUser('user', true);
		userIDs = [user.id];
	} else if (subcommand === 'multiuser') {
		const users = interaction.options.getString('users', true);
		userIDs = [...new Set(Array.from(users.matchAll(/\d{17,18}/g), match => match[0]))];
	} else {
		throw new Error(`Unknown warn subcommand: ${subcommand}`);
	}

	await warnHandler(interaction, userIDs, reason);
}

export async function warnHandler(interaction: CommandInteraction | ModalSubmitInteraction, userIDs: string[], reason: string): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild!.fetch();
	const executor = interaction.user;

	const warningListEmbed = new EmbedBuilder();
	warningListEmbed.setTitle('User Warnings :thumbsdown:');
	warningListEmbed.setColor(0xFFA500);

	for (const userID of userIDs) {
		const member = await interaction.guild!.members.fetch(userID);
		const user = member.user;

		await untrustUser(member, interaction.createdAt);

		const eventLogEmbed = new EmbedBuilder();

		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('Event Type: _Member Warned_'); // Default type
		eventLogEmbed.setFields( // Default fields
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
				name: 'From bot /warn command',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		const { count, rows } = await Warning.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		const totalWarnings = count+1;

		let punishmentEmbed;
		let isKick;
		let isBan;

		if (totalWarnings === 3) { // 2 previous warnings, this would be the 3rd strike
			eventLogEmbed.setColor(0xEF7F31);
			eventLogEmbed.setTitle('Event Type: _Member Kicked_');

			punishmentEmbed = new EmbedBuilder();

			punishmentEmbed.setTitle('Punishment Details');
			punishmentEmbed.setDescription('You have been kicked from the Pretendo Network server. You may rejoin after reviewing the details of the kick below');
			punishmentEmbed.setColor(0xEF7F31);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setAuthor({
				name: `Kicked by: ${executor.tag}`,
				iconURL: executor.avatarURL() ?? undefined
			});
			punishmentEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			punishmentEmbed.setFields(
				{
					name: 'Kick Reason',
					value: reason
				},
				{
					name: 'From warnings',
					value: 'This kick was the result of being warned 3 times. Be aware that a 4th warning will result in a ban'
				}
			);

			isKick = true;
		}

		if (totalWarnings >= 4) { // At least 3 previous warnings. They were kicked already, this is a ban
			eventLogEmbed.setColor(0xF24E43);
			eventLogEmbed.setTitle('Event Type: _Member Banned_');

			punishmentEmbed = new EmbedBuilder();

			punishmentEmbed.setTitle('Punishment Details');
			punishmentEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
			punishmentEmbed.setColor(0xF24E43);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setAuthor({
				name: `Banned by: ${executor.tag}`,
				iconURL: executor.avatarURL() ?? undefined
			});
			punishmentEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			punishmentEmbed.setFields(
				{
					name: 'Ban Reason',
					value: reason
				},
				{
					name: 'From warnings',
					value: 'This ban was the result of being warned 4 times. Below is a list of all previous warnings'
				}
			);

			isBan = true;
		}

		await sendModLogMessage(guild, null, eventLogEmbed);

		if (punishmentEmbed) {
			const pastWarningsEmbed = new EmbedBuilder();
			pastWarningsEmbed.setTitle('Past Warnings');
			pastWarningsEmbed.setDescription('For clarifty purposes here is a list of your past warnings');
			pastWarningsEmbed.setColor(0xEF7F31);
			pastWarningsEmbed.setTimestamp(Date.now());
			pastWarningsEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});

			for (let i = 0; i < rows.length; i++) {
				const warning = rows[i];
				const warningBy = await interaction.client.users.fetch(warning.admin_user_id);

				pastWarningsEmbed.addFields(
					{
						name: `${ordinal(i + 1)} Warning`,
						value: warning.reason
					},
					{
						name: 'Punished By',
						value: warningBy.tag,
						inline: true
					},
					{
						name: 'Date',
						value: warning.timestamp.toLocaleDateString(),
						inline: true
					}
				);
			}

			await notifyUser(guild, user, {
				embeds: [punishmentEmbed, pastWarningsEmbed]
			});

			if (isKick) {
				await member.kick(reason);

				await Kick.create({
					user_id: member.id,
					admin_user_id: executor.id,
					reason: reason,
					from_warning: true
				});
			} else if (isBan) {
				await member.ban({
					reason
				});

				await Ban.create({
					user_id: member.id,
					admin_user_id: executor.id,
					reason: reason,
					from_warning: true
				});
			} else {
				// ???
			}
		} else {
			punishmentEmbed = new EmbedBuilder();

			punishmentEmbed.setTitle('Warning');
			punishmentEmbed.setDescription('You have been issued a warning.\nYou may review the details of your warning below');
			punishmentEmbed.setColor(0xF24E43);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setAuthor({
				name: `Warned by: ${executor.tag}`,
				iconURL: executor.avatarURL() ?? undefined
			});
			punishmentEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			punishmentEmbed.setFields(
				{
					name: 'Reason',
					value: reason
				},
				{
					name: 'Total Warnings',
					value: totalWarnings.toString()
				},
				{
					name: 'Warnings Left Until Kick',
					value: Math.max(0, 3 - totalWarnings).toString()
				},
				{
					name: 'Warnings Left Until Ban',
					value: Math.max(0, 4 - totalWarnings).toString()
				}
			);

			await notifyUser(guild, user, {
				embeds: [punishmentEmbed]
			});
		}

		await Warning.create({
			user_id: member.id,
			admin_user_id: executor.id,
			reason: reason
		});

		warningListEmbed.addFields([
			{ name: `${member.user.username}'s warnings`, value: totalWarnings.toString(), inline: true }
		]);
	}

	await interaction.followUp({ embeds: [warningListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('warn')
	.setDescription('Warn user(s)')
	.addSubcommand(subcommand => {
		return subcommand.setName('user')
			.setDescription('Warn a user')
			.addUserOption(option => {
				return option.setName('user')
					.setDescription('User to warn')
					.setRequired(true);
			})
			.addStringOption(option => {
				return option.setName('reason')
					.setDescription('Reason for the warning')
					.setRequired(true);
			});
	})
	.addSubcommand(subcommand => {
		return subcommand.setName('multiuser')
			.setDescription('Warn multiple users')
			.addStringOption(option => {
				return option.setName('users')
					.setDescription('User(s) to warn')
					.setRequired(true);
			})
			.addStringOption(option => {
				return option.setName('reason')
					.setDescription('Reason for the warning')
					.setRequired(true);
			});
	});

export default {
	name: command.name,
	handler: warnCommandHandler,
	deploy: command.toJSON()
};
