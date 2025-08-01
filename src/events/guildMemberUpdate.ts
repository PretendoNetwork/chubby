import { untrustUser } from '@/leveling';
import { getRoleFromSettings } from '@/util';
import type { GuildMember, PartialGuildMember } from 'discord.js';

export default async function guildMemberUpdateHandler(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
	const untrustedRole = await getRoleFromSettings(newMember.guild, 'untrusted');
	if (!untrustedRole) {
		return;
	}

	if (!oldMember.roles.cache.has(untrustedRole.id) && newMember.roles.cache.has(untrustedRole.id)) {
		await untrustUser(newMember, new Date());
	}
}
