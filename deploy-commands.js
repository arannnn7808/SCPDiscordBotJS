require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];

// Función para cargar comandos desde una carpeta
function loadCommandsFromFolder(folder) {
    const commandsPath = path.join(__dirname, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        commands.push(command.data.toJSON());
    }
}

loadCommandsFromFolder('commands'); // carga la carpeta commands
loadCommandsFromFolder('api'); // carga la carpeta api

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Se estan refrescando los comandos (/).');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Se han refrescado los comandos (/).');
    } catch (error) {
        console.error(error);
    }
})();
