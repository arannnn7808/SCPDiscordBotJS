const { Collection } = require('discord.js');

class CooldownManager {
    constructor() {
        this.cooldowns = new Collection();
    }

    setCooldown(userId, commandName, duration) {
        const key = `${userId}-${commandName}`;
        const expirationTime = Date.now() + duration * 1000;
        this.cooldowns.set(key, expirationTime);
    }

    getCooldownRemaining(userId, commandName) {
        const key = `${userId}-${commandName}`;
        const expirationTime = this.cooldowns.get(key);

        if (!expirationTime) return 0;

        const now = Date.now();
        if (now >= expirationTime) {
            this.cooldowns.delete(key);
            return 0;
        }

        return Math.ceil((expirationTime - now) / 1000);
    }
}

module.exports = new CooldownManager();