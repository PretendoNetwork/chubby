import { readFileSync } from 'fs';
import path from 'path';

interface Config {
    bot_token: string;
    json_db_path: string;
    sequelize: {
        force: boolean;
        alter: boolean;
    }
}

const rawConfigData = readFileSync(path.join(process.cwd(), './config.json'), { encoding: 'utf-8' });
const configData: Config = JSON.parse(rawConfigData);

export default configData;
