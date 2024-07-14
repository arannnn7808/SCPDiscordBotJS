require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, ActivityType, PresenceUpdateStatus } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.commands = new Collection();

function loadCommandsFromFolder(folder) {
    const commandsPath = path.join(__dirname, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        client.commands.set(command.data.name, command);
    }
}

loadCommandsFromFolder('commands'); // carga carpeta commands
loadCommandsFromFolder('api'); // carga carpeta api

client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: process.env.PRESENCE_TEXT, type: ActivityType.Watching }],
        status: PresenceUpdateStatus.DoNotDisturb,
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Hubo un error al ejecutar este comando.', ephemeral: true });
    }
});

client.login(process.env.BOT_TOKEN);
