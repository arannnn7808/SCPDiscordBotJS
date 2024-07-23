require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const { COMMAND_FOLDERS } = require("./config/constants");

const commands = [];

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
        commands.push(command.data.toJSON());
      }
    });
  });
}

loadCommands();

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("Refrescando comandos (/).");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Comandos (/) refrescados exitosamente.");
  } catch (error) {
    console.error("Error al refrescar comandos:", error);
  }
})();
