require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];

function loadCommands() {
    ['commands', 'api'].forEach(folder => {
        const commandsPath = path.join(__dirname, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        commandFiles.forEach(file => {
            const command = require(path.join(commandsPath, file));
            if ('data' in command) {
                commands.push(command.data.toJSON());
            }
        });
    });
}

loadCommands();

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Refrescando comandos (/).');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Comandos (/) refrescados exitosamente.');
    } catch (error) {
        console.error('Error al refrescar comandos:', error);
    }
})();