const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'warnings.db');
        this.db = null;
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
            indexes: [
                'CREATE INDEX IF NOT EXISTS idx_guild_user ON warnings(guild_id, user_id)'
            ]
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
                if (err) {
                    logger.error('Could not connect to database', err);
                    reject(err);
                } else {
                    logger.info('Connected to the SQLite database.');
                    try {
                        await this.initSchema();
                        resolve();
                    } catch (initErr) {
                        reject(initErr);
                    }
                }
            });
        });
    }

    async initSchema() {
        await this.runTransaction(async () => {
            await this.run(this.currentSchema.warnings);
            for (const index of this.currentSchema.indexes) {
                await this.run(index);
            }
            await this.checkAndUpdateSchema();
        });
        logger.info('Database schema initialized and up to date.');
    }

    async checkAndUpdateSchema() {
        const currentColumns = await this.getTableInfo('warnings');
        const schemaColumns = this.extractColumnsFromSchema(this.currentSchema.warnings);

        const missingColumns = schemaColumns.filter(col => !currentColumns.includes(col));
        for (const column of missingColumns) {
            await this.addColumn('warnings', column);
            logger.info(`Added new column: ${column} to warnings table`);
        }
    }

    extractColumnsFromSchema(schemaSQL) {
        const columnRegex = /(\w+)\s+(TEXT|INTEGER)/g;
        const matches = [...schemaSQL.matchAll(columnRegex)];
        return matches.map(match => match[1].toLowerCase());
    }

    async getTableInfo(tableName) {
        const rows = await this.all(`PRAGMA table_info(${tableName})`);
        return rows.map(row => row.name.toLowerCase());
    }

    async addColumn(tableName, columnName) {
        await this.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT`);
    }

    async runTransaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                callback().then(() => {
                    this.db.run('COMMIT', (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }).catch((err) => {
                    this.db.run('ROLLBACK');
                    reject(err);
                });
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    logger.error('Error running sql ' + sql, err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, result) => {
                if (err) {
                    logger.error('Error running sql: ' + sql, err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    logger.error('Error running sql: ' + sql, err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async addWarning(guildId, userId, reason, moderatorId) {
        const warnId = await this.getNextWarnId(guildId, userId);
        const result = await this.run(
            'INSERT INTO warnings (guild_id, user_id, warn_id, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [guildId, userId, warnId, reason, moderatorId, Date.now()]
        );
        logger.info(`Warning added for user ${userId} in guild ${guildId}, warn_id: ${warnId}`);
        return { id: result.id, warnId };
    }

    getWarnings(guildId, userId) {
        return this.all(
            'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY warn_id ASC',
            [guildId, userId]
        );
    }

    async removeWarning(guildId, userId, warnId) {
        const result = await this.run(
            'DELETE FROM warnings WHERE guild_id = ? AND user_id = ? AND warn_id = ?',
            [guildId, userId, warnId]
        );
        logger.info(`Removed warning #${warnId} for user ${userId} in guild ${guildId}`);
        return result.changes > 0;
    }

    async clearWarnings(guildId, userId) {
        const result = await this.run(
            'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );
        logger.info(`Cleared ${result.changes} warnings for user ${userId} in guild ${guildId}`);
        return result.changes;
    }

    async getNextWarnId(guildId, userId) {
        const result = await this.get(
            'SELECT COALESCE(MAX(warn_id), 0) + 1 as next_id FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );
        return result.next_id;
    }

    getTotalWarnings(guildId) {
        return this.get('SELECT COUNT(*) as total FROM warnings WHERE guild_id = ?', [guildId])
            .then(result => result.total);
    }

    getMostWarnedUsers(guildId, limit = 5) {
        return this.all(
            `SELECT user_id, COUNT(*) as warn_count 
             FROM warnings 
             WHERE guild_id = ? 
             GROUP BY user_id 
             ORDER BY warn_count DESC 
             LIMIT ?`,
            [guildId, limit]
        );
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        logger.error('Error closing the database', err);
                        reject(err);
                    } else {
                        logger.info('Database connection closed.');
                        this.db = null;
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