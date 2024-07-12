import { MessageEmbed, MessageMentions } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Warning } from '@/models/warnings';
import { Kick } from '@/models/kicks';
import { Ban } from '@/models/bans';
import { ordinal, sendEventLogMessage } from '@/util';
import type { CommandInteraction } from 'discord.js';

async function warnHandler(interaction: CommandInteraction): Promise<void> {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild!.fetch();
	const executor = interaction.user;
	const users = interaction.options.getString('users')!;
	const reason = interaction.options.getString('reason')!;

	const userIds = [...new Set(Array.from(users.matchAll(MessageMentions.USERS_PATTERN), match => match[1]))];

	const warningListEmbed = new MessageEmbed();
	warningListEmbed.setTitle('User Warnings :thumbsdown:');
	warningListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild!.members.fetch(userId);
		const user = member.user;

		const eventLogEmbed = new MessageEmbed();

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

			punishmentEmbed = new MessageEmbed();

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

			punishmentEmbed = new MessageEmbed();

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

		await sendEventLogMessage(guild, null, eventLogEmbed);

		if (punishmentEmbed) {
			const pastWarningsEmbed = new MessageEmbed();
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

			await member.send({
				embeds: [punishmentEmbed, pastWarningsEmbed]
			}).catch(() => console.log('Failed to DM user'));

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
			punishmentEmbed = new MessageEmbed();

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

			await member.send({
				embeds: [punishmentEmbed]
			}).catch(() => console.log('Failed to DM user'));
		}

		await Warning.create({
			user_id: member.id,
			admin_user_id: executor.id,
			reason: reason
		});

		warningListEmbed.addField(`${member.user.username}'s warnings`, totalWarnings.toString(), true);
	}

	await interaction.editReply({ embeds: [warningListEmbed] });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('warn')
	.setDescription('Warn user(s)')
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

export default {
	name: command.name,
	handler: warnHandler,
	deploy: command.toJSON()
};