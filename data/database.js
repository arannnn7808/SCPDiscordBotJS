const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.warningsDbPath = path.join(__dirname, 'warnings.db');
        this.levelsDbPath = path.join(__dirname, 'levels.db');
        this.warningsDb = null;
        this.levelsDb = null;
        this.currentSchema = {
            warnings: `
                CREATE TABLE IF NOT EXISTS warnings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT,
                    user_id TEXT,
                    warn_id INTEGER,
                    reason TEXT,
                    moderator_id TEXT,
                    timestamp INTEGER,
                    UNIQUE(guild_id, user_id, warn_id)
                )
            `,
            levels: `
                CREATE TABLE IF NOT EXISTS levels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT,
                    user_id TEXT,
                    xp INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 0,
                    last_message_timestamp INTEGER,
                    UNIQUE(guild_id, user_id)
                )
            `,
            indexes: {
                warnings: [
                    'CREATE INDEX IF NOT EXISTS idx_guild_user ON warnings(guild_id, user_id)'
                ],
                levels: [
                    'CREATE INDEX IF NOT EXISTS idx_levels_guild_user ON levels(guild_id, user_id)'
                ]
            }
        };
    }

    async connect() {
        return Promise.all([
            this.connectDatabase('warnings', this.warningsDbPath),
            this.connectDatabase('levels', this.levelsDbPath)
        ]);
    }

    async connectDatabase(dbName, dbPath) {
        return new Promise((resolve, reject) => {
            this[`${dbName}Db`] = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
                if (err) {
                    logger.error(`Could not connect to ${dbName} database`, err);
                    reject(err);
                } else {
                    logger.info(`Connected to the ${dbName} SQLite database.`);
                    try {
                        await this.initSchema(dbName);
                        resolve();
                    } catch (initErr) {
                        reject(initErr);
                    }
                }
            });
        });
    }

    async initSchema(dbName) {
        await this.runTransaction(async () => {
            await this.run(this.currentSchema[dbName], [], dbName);
            for (const index of this.currentSchema.indexes[dbName]) {
                await this.run(index, [], dbName);
            }
            await this.checkAndUpdateSchema(dbName);
        }, dbName);
        logger.info(`${dbName} database schema initialized and up to date.`);
    }

    async checkAndUpdateSchema(dbName) {
        const currentColumns = await this.getTableInfo(dbName, dbName);
        const schemaColumns = this.extractColumnsFromSchema(this.currentSchema[dbName]);

        const missingColumns = schemaColumns.filter(col => !currentColumns.includes(col));
        for (const column of missingColumns) {
            await this.addColumn(dbName, dbName, column);
            logger.info(`Added new column: ${column} to ${dbName} table`);
        }
    }

    extractColumnsFromSchema(schemaSQL) {
        const columnRegex = /(\w+)\s+(TEXT|INTEGER)/g;
        const matches = [...schemaSQL.matchAll(columnRegex)];
        return matches.map(match => match[1].toLowerCase());
    }

    async getTableInfo(tableName, dbName) {
        const rows = await this.all(`PRAGMA table_info(${tableName})`, [], dbName);
        return rows.map(row => row.name.toLowerCase());
    }

    async addColumn(tableName, dbName, columnName) {
        await this.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT`, [], dbName);
    }

    async runTransaction(callback, dbName) {
        return new Promise((resolve, reject) => {
            this[`${dbName}Db`].serialize(() => {
                this[`${dbName}Db`].run('BEGIN TRANSACTION');
                callback().then(() => {
                    this[`${dbName}Db`].run('COMMIT', (err) => {
                        if (err) {
                            this[`${dbName}Db`].run('ROLLBACK');
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }).catch((err) => {
                    this[`${dbName}Db`].run('ROLLBACK');
                    reject(err);
                });
            });
        });
    }

    run(sql, params = [], dbName) {
        return new Promise((resolve, reject) => {
            this[`${dbName}Db`].run(sql, params, function(err) {
                if (err) {
                    logger.error(`Error running sql ${sql} on ${dbName} database`, err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = [], dbName) {
        return new Promise((resolve, reject) => {
            this[`${dbName}Db`].get(sql, params, (err, result) => {
                if (err) {
                    logger.error(`Error running sql: ${sql} on ${dbName} database`, err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    all(sql, params = [], dbName) {
        return new Promise((resolve, reject) => {
            this[`${dbName}Db`].all(sql, params, (err, rows) => {
                if (err) {
                    logger.error(`Error running sql: ${sql} on ${dbName} database`, err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Warnings methods
    async addWarning(guildId, userId, reason, moderatorId) {
        const warnId = await this.getNextWarnId(guildId, userId);
        const result = await this.run(
            'INSERT INTO warnings (guild_id, user_id, warn_id, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [guildId, userId, warnId, reason, moderatorId, Date.now()],
            'warnings'
        );
        logger.info(`Warning added for user ${userId} in guild ${guildId}, warn_id: ${warnId}`);
        return { id: result.id, warnId };
    }

    async getWarnings(guildId, userId) {
        return this.all(
            'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY warn_id ASC',
            [guildId, userId],
            'warnings'
        );
    }

    async removeWarning(guildId, userId, warnId) {
        const result = await this.run(
            'DELETE FROM warnings WHERE guild_id = ? AND user_id = ? AND warn_id = ?',
            [guildId, userId, warnId],
            'warnings'
        );
        logger.info(`Removed warning #${warnId} for user ${userId} in guild ${guildId}`);
        return result.changes > 0;
    }

    async clearWarnings(guildId, userId) {
        const result = await this.run(
            'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId],
            'warnings'
        );
        logger.info(`Cleared ${result.changes} warnings for user ${userId} in guild ${guildId}`);
        return result.changes;
    }

    async getNextWarnId(guildId, userId) {
        const result = await this.get(
            'SELECT COALESCE(MAX(warn_id), 0) + 1 as next_id FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId],
            'warnings'
        );
        return result.next_id;
    }

    async getTotalWarnings(guildId) {
        const result = await this.get('SELECT COUNT(*) as total FROM warnings WHERE guild_id = ?', [guildId], 'warnings');
        return result.total;
    }

    async getMostWarnedUsers(guildId, limit = 5) {
        return this.all(
            `SELECT user_id, COUNT(*) as warn_count 
             FROM warnings 
             WHERE guild_id = ? 
             GROUP BY user_id 
             ORDER BY warn_count DESC 
             LIMIT ?`,
            [guildId, limit],
            'warnings'
        );
    }

    // Levels methods
    async addXP(guildId, userId, xpToAdd) {
        const user = await this.getUser(guildId, userId);
        if (user) {
            const newXP = user.xp + xpToAdd;
            const newLevel = this.calculateLevel(newXP);
            await this.run(
                'UPDATE levels SET xp = ?, level = ?, last_message_timestamp = ? WHERE guild_id = ? AND user_id = ?',
                [newXP, newLevel, Date.now(), guildId, userId],
                'levels'
            );
            return { xp: newXP, level: newLevel, oldLevel: user.level };
        } else {
            const newLevel = this.calculateLevel(xpToAdd);
            await this.run(
                'INSERT INTO levels (guild_id, user_id, xp, level, last_message_timestamp) VALUES (?, ?, ?, ?, ?)',
                [guildId, userId, xpToAdd, newLevel, Date.now()],
                'levels'
            );
            return { xp: xpToAdd, level: newLevel, oldLevel: 0 };
        }
    }

    async getUser(guildId, userId) {
        return this.get('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?', [guildId, userId], 'levels');
    }

    calculateLevel(xp) {
        return Math.floor(0.1 * Math.sqrt(xp));
    }

    async getLeaderboard(guildId, limit = 10) {
        return this.all(
            'SELECT * FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?',
            [guildId, limit],
            'levels'
        );
    }

    async setXP(guildId, userId, xp) {
        const level = this.calculateLevel(xp);
        const result = await this.run(
            'INSERT OR REPLACE INTO levels (guild_id, user_id, xp, level, last_message_timestamp) VALUES (?, ?, ?, ?, ?)',
            [guildId, userId, xp, level, Date.now()],
            'levels'
        );
        return { xp, level, changes: result.changes };
    }

    async clearInactiveUsers(guildId, activeUserIds) {
        return new Promise((resolve, reject) => {
            const placeholders = activeUserIds.map(() => '?').join(',');
            const sql = `DELETE FROM levels WHERE guild_id = ? AND user_id NOT IN (${placeholders})`;
            const params = [guildId, ...activeUserIds];

            logger.debug(`Executing SQL: ${sql}`);
            logger.debug(`Parameters: guildId=${guildId}, activeUserIds.length=${activeUserIds.length}`);

            this.levelsDb.run(sql, params, function(err) {
                if (err) {
                    logger.error(`Error clearing inactive users for guild ${guildId}`, err);
                    reject(err);
                } else {
                    logger.info(`Cleared ${this.changes} inactive users for guild ${guildId}`);
                    resolve(this.changes);
                }
            });
        });
    }
    
    async resetUserLevel(guildId, userId) {
        const result = await this.run(
            'DELETE FROM levels WHERE guild_id = ? AND user_id = ?',
            [guildId, userId],
            'levels'
        );
        return result.changes > 0;
    }

    async close() {
        await Promise.all([
            this.closeDatabase('warnings'),
            this.closeDatabase('levels')
        ]);
    }

    async closeDatabase(dbName) {
        return new Promise((resolve, reject) => {
            if (this[`${dbName}Db`]) {
                this[`${dbName}Db`].close((err) => {
                    if (err) {
                        logger.error(`Error closing the ${dbName} database`, err);
                        reject(err);
                    } else {
                        logger.info(`${dbName} database connection closed.`);
                        this[`${dbName}Db`] = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new Database();