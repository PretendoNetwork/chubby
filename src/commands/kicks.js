const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Kicks = require('../models/kicks');

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


	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		const { count } = await Kicks.findAndCountAll({
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
	}

	const image = new Discord.MessageAttachment('./src/images/mod/mod-kick.png');
	kickListEmbed.setThumbnail('attachment://mod-kick.png');
	await interaction.editReply({ embeds: [kickListEmbed], files: [image], ephemeral: true });
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