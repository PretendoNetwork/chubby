const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Warnings = require('../models/warnings');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function warningsHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const users = interaction.options.getString('users');

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const warningListEmbed = new Discord.MessageEmbed();
	warningListEmbed.setTitle('Previous User Warnings');
	warningListEmbed.setColor(0xffc800);


	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;
	
		const { count } = await Warnings.findAndCountAll({
			where: {
				user_id: member.id
			}
		});
	
		warningListEmbed.setDescription(`${user.username} previous warns:`);
		warningListEmbed.addFields(
			{
				name: `${user.username}'s warns`,
				value: count.toString()
			},
			{
				name: 'Warnings Left Until Kick',
				value: Math.max(0, 3 - count).toString()
			},
			{
				name: 'Warnings Left Until Ban',
				value: Math.max(0, 4 - count).toString()
			}
		);

		warningListEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
	
		warningListEmbed.setTimestamp(Date.now());
	}

	const warnImage = new Discord.MessageAttachment('./src/images/mod/mod-warn.png');
	warningListEmbed.setThumbnail('attachment://mod-warn.png');
	await interaction.editReply({ embeds: [warningListEmbed], files: [warnImage], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('warnings')
	.setDescription("See user(s) warns")
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to see warns of')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: warningsHandler,
	deploy: command.toJSON()
};