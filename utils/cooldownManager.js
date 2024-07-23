const { Collection } = require("discord.js");
const logger = require("./logger");

class CooldownManager {
  constructor() {
    this.cooldowns = new Collection();
  }

  setCooldown(userId, commandName, duration) {
    const key = `${userId}-${commandName}`;
    const expirationTime = Date.now() + duration * 1000;
    this.cooldowns.set(key, expirationTime);
    logger.debug(
      `Cooldown set for user ${userId} on command ${commandName} for ${duration} seconds`,
    );
  }

  getCooldownRemaining(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const expirationTime = this.cooldowns.get(key);

    if (!expirationTime) return 0;

    const now = Date.now();
    const timeLeft = expirationTime - now;

    if (timeLeft <= 0) {
      this.cooldowns.delete(key);
      return 0;
    }

    return Math.ceil(timeLeft / 1000);
  }

  clearCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    this.cooldowns.delete(key);
    logger.debug(
      `Cooldown cleared for user ${userId} on command ${commandName}`,
    );
  }

  clearExpiredCooldowns() {
    const now = Date.now();
    this.cooldowns.sweep((expirationTime) => expirationTime <= now);
    logger.debug("Expired cooldowns cleared");
  }
}

module.exports = new CooldownManager();
