import { getDBList } from '@/db';
import { ModPingSettings } from '@/models/modPingSettings';
import { getRoleFromSettings } from '@/util';
import type { Presence } from 'discord.js';

export default async function presenceUpdateHandler(oldPresence: Presence | null, newPresence: Presence): Promise<void> {
	if (!newPresence?.member) {
		return;
	}
	const member = newPresence.member;

	const settings = await ModPingSettings.findOne({
		where: { 
			user_id: member.id 
		}
	});

	if (!settings) {
		return;
	}
    
	const { online, idle, dnd, offline } = settings;

	const role = await getRoleFromSettings(member.guild!, 'roles.mod-ping');

	if (!role) {
		console.log('Missing mod-ping role in settings!');
		return;
	}
	const allowedRoles = getDBList('roles.mod-ping-allowed');
	const hasAllowedRole = member.roles.cache.some(role => allowedRoles.includes(role.id));

	if (!hasAllowedRole) {
		await ModPingSettings.destroy({
			where: { 
				user_id: member.id 
			}
		});
		await member.roles.remove(role);
		console.log(`Deleted auto-assign for ${member.user.tag} as they have been demoted`);
		return;
	}

	let shouldHaveRole;

	if (newPresence.status === 'online' && online) {
		shouldHaveRole = true;
	} else if (newPresence.status === 'idle' && idle) {
		shouldHaveRole = true;
	} else if (newPresence.status === 'dnd' && dnd) {
		shouldHaveRole = true;
	} else if (newPresence.status === 'offline' && offline) {
		shouldHaveRole = true;
	} else {
		shouldHaveRole = false;
	}

	if (shouldHaveRole) {
		await member.roles.add(role);
		console.log(`Added @${role.name} to ${member.user.tag}`);
	} else {
		await member.roles.remove(role);
		console.log(`Removed @${role.name} from ${member.user.tag}`);
	}
}
