require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const { REST, Routes } = require("discord.js");
const { COMMAND_FOLDERS } = require("./config/constants");
const logger = require("./utils/logger");

async function loadCommands() {
  const commands = [];
  for (const folder of COMMAND_FOLDERS) {
    const commandsPath = path.join(__dirname, "commands", folder);
    const commandFiles = await fs.readdir(commandsPath);
    await Promise.all(commandFiles.map(async (file) => {
      if (file.endsWith(".js")) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          commands.push(command.data.toJSON());
          logger.info(`Loaded command for deployment: ${command.data.name}`);
        } else {
          logger.warn(`Invalid command file for deployment: ${filePath}`);
        }
      }
    }));
  }
  return commands;
}

async function deployCommands() {
  try {
    logger.info("Starting command deployment...");

    const commands = await loadCommands();
    logger.info(`Loaded ${commands.length} commands for deployment`);

    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

    logger.info("Refreshing application (/) commands...");
    const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error("Error deploying commands:", error);
  }
}

deployCommands();