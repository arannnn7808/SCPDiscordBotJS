require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require("discord.js");
const { COMMAND_FOLDERS } = require("./config/constants");
const logger = require("./utils/logger");
const rateLimiter = require("./utils/rateLimiter");
const { createErrorEmbed } = require("./utils/embedBuilder");
const { handleCommandError } = require("./utils/errorHandler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

const requiredEnvVars = [
  "BOT_TOKEN",
  "CLIENT_ID",
  "SERVER_ID_API",
  "PRESENCE_TEXT",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(
      `Missing required environment variable: ${envVar}`,
      new Error(`${envVar} is not defined`),
    );
    process.exit(1);
  }
}

function loadCommands() {
  COMMAND_FOLDERS.forEach((folder) => {
    const commandsPath = path.join(__dirname, "commands", folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));
    commandFiles.forEach((file) => {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        command.folder = folder;
        client.commands.set(command.data.name, command);
        rateLimiter.addLimit(
          command.data.name,
          command.rateLimit?.maxUses || 5,
          command.rateLimit?.duration || 60000,
        );
        logger.info(`Loaded command: ${command.data.name} from ${folder}`);
      } else {
        logger.warn(
          `The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    });
  });
}

function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));
  eventFiles.forEach((file) => {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(`Loaded event: ${event.name}`);
  });
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  const timeLeft = await rateLimiter.rateLimit(
    interaction.user.id,
    command.data.name,
  );
  if (timeLeft) {
    const errorEmbed = createErrorEmbed(
      "Rate Limit Excedido",
      `Por favor, espera ${timeLeft} segundos antes de usar este comando de nuevo.`,
    );
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ embeds: [errorEmbed], ephemeral: true })
        .catch((error) => {
          logger.error("Error sending rate limit message", error);
        });
    }
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing ${command.data.name}`, error);
    await handleCommandError(interaction, error);
  }
});

client.once("ready", () => {
  logger.info(`Logged in as ${client.user.tag}`);
  client.user.setActivity(process.env.PRESENCE_TEXT, {
    type: ActivityType.WATCHING,
  });
});

loadCommands();
loadEvents();

client
  .login(process.env.BOT_TOKEN)
  .then(() => logger.info("Bot logged in successfully"))
  .catch((error) => logger.error("Failed to log in", error));

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection:", error);
});

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await client.destroy();
  logger.info("Bot disconnected.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
