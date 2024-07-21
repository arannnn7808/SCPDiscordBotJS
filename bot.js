require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, ActivityType, PresenceUpdateStatus } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] });

client.commands = new Collection();

function loadCommands() {
    const commandFolders = ['commands', 'api'];
    commandFolders.forEach(folder => {
        const commandsPath = path.join(__dirname, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        commandFiles.forEach(file => {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        });
    });
}

loadCommands();

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
        console.error(`Error ejecutando ${interaction.commandName}:`, error);
        const content = 'Hubo un error al ejecutar este comando.';
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);