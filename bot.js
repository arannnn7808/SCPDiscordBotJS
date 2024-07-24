require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { COMMAND_FOLDERS } = require("./config/constants");
const ErrorHandler = require("./utils/errorHandler");
const CommandHandler = require("./utils/commandHandler");
const PermissionCheck = require("./utils/permissionCheck");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

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
        client.commands.set(command.data.name, command);
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
  });
}

loadCommands();
loadEvents();

// Initialize global error handler
ErrorHandler.init(client);

// Initialize global command handler
CommandHandler.init(client);

// Set up global permission check (if needed)
PermissionCheck.global(client, ["SEND_MESSAGES", "VIEW_CHANNEL"]);

client.login(process.env.BOT_TOKEN);
