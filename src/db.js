const JSONdb = require('simple-json-db');
const path = require('path');
const db = new JSONdb(path.join(__dirname, '../db.json'));

function getDB() {
	return db;
}

/**
 * Get db item as list
 * @param key key to get value from
 * @returns array of strings, if value doesnt exist its an empty array
 */
function getDBList(key) {
	const data = db.get(key);
	if (!data) return [];
	return data.split(',');
}

/**
 * store array in db
 * WARNING: may not contain ANY comma's in the strings
 * @param key key to get value from
 * @param array array of strings to store
 */
function setDBList(key, array) {
	if (array.find(v=>v.contains(',')))
		throw new Error('List items cannot contain any commas');
	db.set(key, array.join(','));
}

module.exports = {
	getDB,
	getDBList,
	setDBList
};
