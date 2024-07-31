const { Collection } = require("discord.js");
const logger = require("./logger");

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
    let usage = this.usages.get(key);

    if (!usage || now > usage.reset) {
      usage = { uses: 0, reset: now + limit.duration };
      this.usages.set(key, usage);
    }

    usage.uses++;

    if (usage.uses > limit.maxUses) {
      const timeLeft = Math.ceil((usage.reset - now) / 1000);
      logger.info(`Rate limit exceeded for user ${userId} on command ${commandName}. Time left: ${timeLeft}s`);
      return timeLeft;
    }

    logger.debug(`Command ${commandName} used by ${userId}. Uses: ${usage.uses}/${limit.maxUses}`);
    return false;
  }

  resetLimit(userId, commandName) {
    const key = `${userId}-${commandName}`;
    this.usages.delete(key);
    logger.info(`Rate limit reset for user ${userId} on command ${commandName}`);
  }

  clearExpiredLimits() {
    const now = Date.now();
    this.usages.sweep((usage) => now > usage.reset);
    logger.debug("Cleared expired rate limits");
  }

  getRemaining(userId, commandName) {
    const limit = this.limits.get(commandName);
    if (!limit) return Infinity;

    const key = `${userId}-${commandName}`;
    const usage = this.usages.get(key);
    if (!usage) return limit.maxUses;

    return Math.max(0, limit.maxUses - usage.uses);
  }

  getReset(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const usage = this.usages.get(key);
    return usage ? usage.reset : 0;
  }
}

module.exports = new RateLimiter();