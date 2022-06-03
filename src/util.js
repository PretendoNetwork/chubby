const Discord = require('discord.js');
const db = require('./db');

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
	const logChannelId = db.getDB().get('channels.event-logs');
	const logChannel = logChannelId && await guild.channels.fetch(logChannelId);

	if (!logChannel) {
		console.log('Missing log channel!');
	} else {
		await logChannel.send({ embeds: [embed] });
	}
}

module.exports = {
	ordinal,
	sendEventLogMessage
};