const { Collection } = require('discord.js');
const logger = require('./logger');

class RateLimiter {
    constructor() {
        this.limits = new Collection();
        this.usages = new Collection();
    }

    addLimit(commandName, maxUses, duration) {
        this.limits.set(commandName, { maxUses, duration });
        logger.info(`Rate limit set for command ${commandName}: ${maxUses} uses per ${duration}ms`);
    }

    async rateLimit(userId, commandName) {
        const limit = this.limits.get(commandName);
        if (!limit) {
            logger.warn(`No rate limit defined for command ${commandName}`);
            return false;
        }

        const key = `${userId}-${commandName}`;
        const now = Date.now();

        if (!this.usages.has(key)) {
            this.usages.set(key, { uses: 0, reset: now + limit.duration });
        }

        const usage = this.usages.get(key);

        if (now > usage.reset) {
            usage.uses = 0;
            usage.reset = now + limit.duration;
        }

        usage.uses++;

        if (usage.uses > limit.maxUses) {
            const timeLeft = (usage.reset - now) / 1000;
            logger.info(`Rate limit exceeded for user ${userId} on command ${commandName}. Time left: ${timeLeft}s`);
            return Math.ceil(timeLeft);
        }

        logger.debug(`Command ${commandName} used by ${userId}. Uses: ${usage.uses}/${limit.maxUses}`);
        return false;
    }

    resetLimit(userId, commandName) {
        const key = `${userId}-${commandName}`;
        this.usages.delete(key);
        logger.info(`Rate limit reset for user ${userId} on command ${commandName}`);
    }
}

module.exports = new RateLimiter();