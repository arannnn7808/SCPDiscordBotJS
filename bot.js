require("dotenv").config();
const { Client, Collection, GatewayIntentBits, ActivityType } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const { COMMAND_FOLDERS } = require("./config/constants");
const ErrorHandler = require("./utils/errorHandler");
const CommandHandler = require("./utils/commandHandler");
const PermissionCheck = require("./utils/permissionCheck");
const logger = require("./utils/logger");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
});

client.commands = new Collection();

async function loadCommands() {
  for (const folder of COMMAND_FOLDERS) {
    const commandsPath = path.join(__dirname, "commands", folder);
    const commandFiles = await fs.readdir(commandsPath);
    await Promise.all(commandFiles.map(async (file) => {
      if (file.endsWith(".js")) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          client.commands.set(command.data.name, command);
          logger.info(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`Invalid command file: ${filePath}`);
        }
      }
    }));
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = await fs.readdir(eventsPath);
  await Promise.all(eventFiles.map(async (file) => {
    if (file.endsWith(".js")) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      logger.info(`Loaded event: ${event.name}`);
    }
  }));
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Initiating graceful shutdown...`);

  try {
    // Set bot status to DND
    await client.user.setPresence({
      activities: [{ name: 'Shutting down...', type: ActivityType.Playing }],
      status: 'dnd',
    });

    // Close all voice connections
    client.voice.adapters.forEach((adapter) => adapter.destroy());

    // Destroy the client connection
    logger.info('Destroying Discord client connection...');
    await client.destroy();

    logger.info('Graceful shutdown completed.');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  } finally {
    // Force exit after a timeout
    setTimeout(() => {
      logger.info('Forcing exit after timeout.');
      process.exit(0);
    }, 5000); // Exit after 5 seconds if graceful shutdown doesn't complete
  }
}

async function initializeBot() {
  try {
    logger.info("Starting bot initialization...");

    ErrorHandler.init(client);
    logger.info("Error handler initialized");

    await Promise.all([loadCommands(), loadEvents()]);
    logger.info("Commands and events loaded");

    CommandHandler.init(client);
    logger.info("Command handler initialized");

    PermissionCheck.global(client, ["SendMessages", "ViewChannel"]);
    logger.info("Global permission check set up");

    await client.login(process.env.BOT_TOKEN);
    logger.info("Bot logged in successfully");

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    logger.info("Graceful shutdown handlers set up");

    logger.info("Bot initialization completed successfully");
  } catch (error) {
    logger.error("Error during bot initialization:", error);
    process.exit(1);
  }
}

initializeBot();

// Optimize garbage collection
if (typeof global.gc === 'function') {
  setInterval(() => {
    global.gc();
    logger.debug('Garbage collection performed');
  }, 30 * 60 * 1000); // Run every 30 minutes
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = client;