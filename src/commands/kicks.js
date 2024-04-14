const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Kicks = require('../models/kicks');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function kicksHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const users = interaction.options.getString('users');

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const kickListEmbed = new Discord.MessageEmbed();
	kickListEmbed.setTitle('Previous User Kicks');
	kickListEmbed.setColor(0xdd6c02);

	const pastKicksEmbed = new Discord.MessageEmbed();
	pastKicksEmbed.setTitle('Past Kicks');
	pastKicksEmbed.setDescription('This user has no previous kicks');
	pastKicksEmbed.setColor(0xdd6c02);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		const { count, rows } = await Kicks.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		kickListEmbed.setDescription(`${user.username} previous kicks:`);
		kickListEmbed.addFields(
			{
				name: `${user.username}'s kicks`,
				value: count.toString()
			},
			{
				name: 'Kicks Left Until Ban',
				value: Math.max(0, 3 - count).toString()
			}
		);

		kickListEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		kickListEmbed.setTimestamp(Date.now());

		if (count > 0) {
			pastKicksEmbed.setTitle('Past Kicks');
			pastKicksEmbed.setDescription(`For clarifty purposes here is a list of ${user.username} past kicks`);
			pastKicksEmbed.setColor(0xdd6c02);
			pastKicksEmbed.setTimestamp(Date.now());
			pastKicksEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});

			for (let i = 0; i < rows.length; i++) {
				const kick = rows[i];
				const kickBy = await interaction.client.users.fetch(kick.admin_user_id);

				pastKicksEmbed.addFields(
					{
						name: `${util.ordinal(i + 1)} Kick`,
						value: kick.reason
					},
					{
						name: 'Punished By',
						value: kickBy.tag,
						inline: true
					},
					{
						name: 'Date',
						value: kick.timestamp.toLocaleDateString(),
						inline: true
					},
					{
						name: 'ID',
						value: kick.id.toString(),
						inline: true
					}
				);
			}
		}
	}

	const kickImage = new Discord.MessageAttachment('./src/images/mod/mod-kick.png');
	kickListEmbed.setThumbnail('attachment://mod-kick.png');
	await interaction.editReply({ embeds: [kickListEmbed, pastKicksEmbed], files: [kickImage], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('kicks')
	.setDescription("See user(s) kicks")
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to see kicks of')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: kicksHandler,
	deploy: command.toJSON()
};