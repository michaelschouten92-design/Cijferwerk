import * as path from 'path';

const dataDir = process.env.DATA_DIR || process.cwd();

export const DB_PATH = path.resolve(dataDir, process.env.DATA_DIR ? 'data/cijferwerk.db' : 'prisma/dev.db');
export const UPLOADS_DIR = path.resolve(dataDir, process.env.DATA_DIR ? 'data/uploads' : 'uploads');
