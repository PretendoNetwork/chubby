import { GuildMember, Presence } from 'discord.js';
import { getDB } from '@/db';
import { ModPingSettings } from '@/models/modPingSettings';

export default async function presenceUpdateHandler(oldPresence: Presence | null, newPresence: Presence): Promise<void> {
	if (!newPresence || !newPresence.member) return;

	const member = newPresence.member as GuildMember;
	const roleId = getDB().get('roles.mod-ping');

	if (!roleId) {
		console.log('Missing mod-ping role ID!');
		return;
	}

	const settings = await ModPingSettings.findOne({
		where: { user_id: member.id }
	});

	if (!settings) return;

	const { online, idle, dnd, offline } = JSON.parse(settings.settings);

	const role = member.guild.roles.cache.get(roleId);
	if (!role) return;

	const hasRole = member.roles.cache.has(roleId);
	let shouldHaveRole = false;
	if (newPresence.status === 'online' && online) {
		shouldHaveRole = true;
	} else if (newPresence.status === 'idle' && idle) {
		shouldHaveRole = true;
	} else if (newPresence.status === 'dnd' && dnd) {
		shouldHaveRole = true;
	} else if (newPresence.status === 'offline' && offline) {
		shouldHaveRole = true;
	}

	if (shouldHaveRole && !hasRole) {
		await member.roles.add(role);
		console.log(`Added ${role.name} to ${member.user.tag}`);
	} else if (!shouldHaveRole && hasRole) {
		await member.roles.remove(role);
		console.log(`Removed ${role.name} from ${member.user.tag}`);
	}
}
