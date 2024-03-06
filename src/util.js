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
 * @param {string|null} originId origin channel id
 * @param {Discord.MessageEmbed} embed
 */
async function sendEventLogMessage(logType, guild, originId, embed, file, components) {
	const logChannelId = db.getDB().get(`${logType}`);
	const logChannel = logChannelId && await guild.channels.fetch(logChannelId);
	
	const blacklistedIds = db.getDBList('channels.event-logs.blacklist');
	if (blacklistedIds.includes(originId)) {
		return;
	}
	if (!logChannel) {
		console.log('Missing log channel!');
	} else {
			await logChannel.send({ embeds: [embed], files: [file], components: [components] });
	}
}

module.exports = {
	ordinal,
	sendEventLogMessage
};