class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  setCooldown(userId, commandName, duration) {
    const key = `${userId}-${commandName}`;
    const expirationTime = Date.now() + duration * 1000;
    this.cooldowns.set(key, expirationTime);
  }

  getRemainingCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const expirationTime = this.cooldowns.get(key);
    if (!expirationTime) return 0;

    const timeLeft = expirationTime - Date.now();
    if (timeLeft <= 0) {
      this.cooldowns.delete(key);
      return 0;
    }

    return Math.ceil(timeLeft / 1000);
  }

  clearCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    this.cooldowns.delete(key);
  }

  clearExpiredCooldowns() {
    const now = Date.now();
    for (const [key, expirationTime] of this.cooldowns.entries()) {
      if (expirationTime <= now) {
        this.cooldowns.delete(key);
      }
    }
  }
}

module.exports = new CooldownManager();