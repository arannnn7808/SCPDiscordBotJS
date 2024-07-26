require("dotenv").config();
const { Client, Collection, GatewayIntentBits, ActivityType } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const { COMMAND_FOLDERS } = require("./config/constants");
const ErrorHandler = require("./utils/errorHandler");
const CommandHandler = require("./utils/commandHandler");
const PermissionCheck = require("./utils/permissionCheck");
const logger = require("./utils/logger");
const database = require("./data/database");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
});

client.commands = new Collection();

async function loadCommand(folder, file) {
  const filePath = path.join(__dirname, "commands", folder, file);
  try {
    logger.debug(`Loading command file: ${filePath}`);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`Invalid command file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error loading command file ${filePath}:`, error);
  }
}

async function loadCommands() {
  logger.info('Starting to load commands...');
  const loadPromises = COMMAND_FOLDERS.map(async (folder) => {
    const commandsPath = path.join(__dirname, "commands", folder);
    const commandFiles = await fs.readdir(commandsPath);
    return Promise.all(commandFiles
        .filter(file => file.endsWith(".js"))
        .map(file => loadCommand(folder, file))
    );
  });

  await Promise.all(loadPromises);
  logger.info(`Finished loading commands. Total commands: ${client.commands.size}`);
}

async function loadEvents() {
  logger.debug('Starting to load events...');
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = await fs.readdir(eventsPath);

  const eventPromises = eventFiles
      .filter(file => file.endsWith(".js"))
      .map(async (file) => {
        const filePath = path.join(eventsPath, file);
        logger.debug(`Loading event file: ${filePath}`);
        const event = require(filePath);
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        logger.info(`Loaded event: ${event.name}`);
      });

  await Promise.all(eventPromises);
  logger.debug('Finished loading events');
}

async function initializeDatabase() {
  logger.debug('Starting database initialization...');
  try {
    await database.connect();
    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize database:", error);
    throw error;
  }
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Initiating graceful shutdown...`);

  try {
    await client.user.setPresence({
      activities: [{ name: 'Shutting down...', type: ActivityType.Playing }],
      status: 'dnd',
    });

    client.voice.adapters.forEach((adapter) => adapter.destroy());

    logger.info('Destroying Discord client connection...');
    await client.destroy();

    logger.info('Closing database connection...');
    await database.close();

    logger.info('Graceful shutdown completed.');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  } finally {
    process.exit(0);
  }
}

async function initializeBot() {
  logger.info("Starting bot initialization...");

  try {
    logger.debug('Initializing database...');
    await initializeDatabase();

    logger.debug('Initializing error handler...');
    ErrorHandler.init(client);
    logger.info("Error handler initialized");

    logger.debug('Loading commands and events...');
    await Promise.all([loadCommands(), loadEvents()]);
    logger.info("Commands and events loaded");

    logger.debug('Initializing command handler...');
    CommandHandler.init(client);
    logger.info("Command handler initialized");

    logger.debug('Setting up global permission check...');
    PermissionCheck.global(client, ["SendMessages", "ViewChannel"]);
    logger.info("Global permission check set up");

    logger.debug('Logging in to Discord...');
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

initializeBot().catch(error => {
  logger.error("Unhandled error during bot initialization:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = client;