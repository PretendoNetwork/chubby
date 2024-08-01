import { ChannelType, PermissionsBitField } from 'discord.js';
import { sequelize } from '@/sequelize-instance';
import type { SlowMode } from '@/models/slow-mode';
import type { Guild, Message } from 'discord.js';

export default async function handleSlowMode(guild: Guild, slowMode: SlowMode): Promise<void> {
	const channel = await guild.channels.fetch(slowMode.channel_id);
	if (channel === null || channel.type !== ChannelType.GuildText) {
		return;
	}

	const filter = async (message: Message): Promise<boolean> => {
		// * This prevents people who are immune to slow mode from counting towards the message rate
		const permissions = channel.permissionsFor(message.member!);
		return !permissions.has([PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageChannels]);
	};

	if (slowMode.enabled) {
		console.log(`Slow mode starting for ${channel.name}`);
	}

	while (slowMode.enabled) {
		const messages = await channel.awaitMessages({ time: slowMode.window, filter });
		const messageCount = messages.size;
		
		await sequelize.transaction(async transaction => {
			await slowMode.reload({ include: 'stages', transaction });

			// * Calculates the rate of messages per minute
			const rate = (60000 / slowMode.window) * messageCount;
			const users = new Set(messages.map(message => message.author.id));

			const stage = (slowMode.stages ?? [])
				.filter(stage => rate >= stage.threshold)
				.sort((a, b) => b.threshold - a.threshold)[0];

			if (stage && channel.rateLimitPerUser !== stage.limit) {
				await channel.setRateLimitPerUser(stage.limit);
			}

			slowMode.users = users.size;
			slowMode.rate = rate;

			await slowMode.save({ transaction });
		});
	}
}