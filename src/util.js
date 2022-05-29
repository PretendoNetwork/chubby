const Discord = require('discord.js');

const ordinalRules = new Intl.PluralRules('en', {
	type: 'ordinal'
});

const suffixes = {
	one: 'st',
	two: 'nd',
	few: 'rd',
	other: 'th'
};

function ordinal(number) {
	const category = ordinalRules.select(number);
	const suffix = suffixes[category];
	return (number + suffix);
}

/**
 * 
 * @param {Discord.Guild} guild
 * @param {Discord.MessageEmbed} embed
 */
async function sendEventLogMessage(guild, embed) {
	const channels = await guild.channels.fetch();
	const logChannel = channels.find(channel => channel.type === 'GUILD_TEXT' && channel.name === 'event-log');

	await logChannel.send({ embeds: [embed] });
}

module.exports = {
	ordinal,
	sendEventLogMessage
};