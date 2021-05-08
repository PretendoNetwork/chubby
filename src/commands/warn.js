const { MessageEmbed } = require('discord.js');
const datastore = require('../datastore');


// /warn user [, user2, user3, ...] reason
async function warnCommand(message, tokens) {
	const mentions = message.mentions;

	const embed = new MessageEmbed();
	embed.setTitle('User Warnings :thumbsdown:');
	embed.setColor(0xffa500);

	// Parse out the warned users
	// We don't use `message.mentions` directly in order to support @mentions in the "reason"
	// For example "/warn @User1 @User2 Don't spam @UserAdmin with offtopic"
	// We would only want to warn users @User1 and @User2 and NOT warn @UserAdmin

	while (tokens[0].startsWith('<@') && tokens[0].endsWith('>')) {
		const token = tokens.shift();
		const id = parseUserID(token);
		const user = mentions.users.get(id);

		// TODO: Improve this
		if (user) {
			let userData = await datastore.findOne({ id: user.id });
			if (!userData) {
				userData = await datastore.insert({ id: user.id, warnings: 1});
			} else {
				userData = await datastore.update({ id: user.id }, { $set: { warnings: userData.warnings+1 } }, {returnUpdatedDocs: true});
			}

			embed.addField(`${user.username}'s warnings`, userData.warnings, true);
		}
	}

	// After parsing the users the tokens array should be left with the warn reason
	const reason = tokens.join(' ');
	
	embed.setDescription(`Warning users for "${reason}"`);

	message.channel.send('Warning users', embed);
}

module.exports = warnCommand;

function parseUserID(id) {
	if (id.startsWith('<@!')) {
		return id.substring(3, id.length - 1);
	} else if (id.startsWith('<@')) {
		return id.substring(2, id.length - 1);
	}

	return id;
}