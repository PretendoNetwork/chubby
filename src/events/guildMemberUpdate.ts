import { getDB } from '@/db';
import { untrustUser } from '@/leveling';
import type { GuildMember, PartialGuildMember } from 'discord.js';

export default async function guildMemberUpdateHandler(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
	const trustedRoleID = getDB().get('roles.trusted');
	const trustedRole = trustedRoleID && (await newMember.guild.roles.fetch(trustedRoleID));
	if (!trustedRole) {
		console.log('Missing trusted role!');
		return;
	}

	const untrustedRoleID = getDB().get('roles.untrusted');
	const untrustedRole = untrustedRoleID && (await newMember.guild.roles.fetch(untrustedRoleID));
	if (!untrustedRole) {
		console.log('Missing no XP role!');
		return;
	}

	if (!oldMember.roles.cache.has(untrustedRoleID) && newMember.roles.cache.has(untrustedRoleID)) {
		untrustUser(newMember, new Date());
	}
}
