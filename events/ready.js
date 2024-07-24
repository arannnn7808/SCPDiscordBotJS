const { ActivityType, PresenceUpdateStatus } = require("discord.js");
const logger = require("../utils/logger");

function updatePresence(client) {
  client.user.setPresence({
    activities: [
      { name: process.env.PRESENCE_TEXT, type: ActivityType.Watching },
    ],
    status: PresenceUpdateStatus.Online,
  });
  logger.info("Bot presence updated");
}

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);
    logger.info(`Loaded ${client.commands.size} commands`);

    updatePresence(client);

    // Update presence every hour
    setInterval(() => updatePresence(client), 3600000);

    logger.info("Bot is fully operational");
  },
};
