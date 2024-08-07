import { EmbedBuilder, MessageMentions } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Ban } from '@/models/bans';
import { sendEventLogMessage, ordinal } from '@/util';
import type { ChatInputCommandInteraction } from 'discord.js';

async function banHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild!.fetch();
	const executor = interaction.user;
	const users = interaction.options.getString('users', true);
	const reason = interaction.options.getString('reason', true);

	const userIds = [...new Set(Array.from(users!.matchAll(new RegExp(MessageMentions.UsersPattern, 'g')), match => match[1]))];

	const bansListEmbed = new EmbedBuilder();
	bansListEmbed.setTitle('User Bans :thumbsdown:');
	bansListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild!.members.fetch(userId);
		const user = member.user;

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
				value: `<@${executor!.id}>`
			},
			{
				name: 'Executor User ID',
				value: executor!.id
			},
			{
				name: 'Reason',
				value: reason
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
		
		const { count, rows } = await Ban.findAndCountAll({
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
		banEmbed.setAuthor({
			name: `Banned by: ${executor.tag}`,
			iconURL: executor.avatarURL() ?? undefined
		});
		banEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});
		banEmbed.setFields({
			name: 'Ban Reason',
			value: reason ?? ''
		});

		sendMemberEmbeds.push(banEmbed);

		if (count > 0) {
			const pastBansEmbed = new EmbedBuilder();
			pastBansEmbed.setTitle('Past Bans');
			pastBansEmbed.setDescription('For clarity purposes here is a list of your past bans');
			pastBansEmbed.setColor(0xEF7F31);
			pastBansEmbed.setTimestamp(Date.now());
			pastBansEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});

			for (let i = 0; i < rows.length; i++) {
				const ban = rows[i];
				const bannedBy = await interaction.client.users.fetch(ban.admin_user_id);

				pastBansEmbed.addFields(
					{
						name: `${ordinal(i + 1)} Ban`,
						value: ban.reason
					},
					{
						name: 'Punished By',
						value: bannedBy.tag,
						inline: true
					},
					{
						name: 'Date',
						value: ban.timestamp.toLocaleDateString(),
						inline: true
					}
				);
			}

			sendMemberEmbeds.push(pastBansEmbed);
		}

		await member.send({
			embeds: sendMemberEmbeds
		}).catch(() => console.log('Failed to DM user'));

		await member.ban({
			reason: reason
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

	await interaction.editReply({ embeds: [bansListEmbed] });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('ban')
	.setDescription('Ban user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to ban')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the ban')
			.setRequired(true);
	});

export default {
	name: command.name,
	handler: banHandler,
	deploy: command.toJSON()
};