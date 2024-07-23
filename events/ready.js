const { ActivityType, PresenceUpdateStatus } = require("discord.js");
const logger = require("../utils/logger");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    logger.info(`Bot conectado como ${client.user.tag}`);
    client.user.setPresence({
      activities: [
        { name: process.env.PRESENCE_TEXT, type: ActivityType.Watching },
      ],
      status: PresenceUpdateStatus.DoNotDisturb,
    });
    logger.info("Bot presence updated");
  },
};
