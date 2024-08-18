import JSONdb from 'simple-json-db';
import path from 'path';
import config from '@/config';

const db = new JSONdb<string>(path.resolve(config.json_db_path));

export function getDB(): JSONdb<string> {
	return db;
}

/**
 * Get db item as list
 * @param key key to get value from
 * @returns array of strings, if value doesnt exist its an empty array
 */
export function getDBList(key: string): Array<string> {
	const data = db.get(key);
	if (!data) {
		return [];
	}
	return data.split(',');
}
