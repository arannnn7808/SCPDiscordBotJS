const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { createBasicEmbed } = require('../../utils/embedBuilder');
const { COMMAND_FOLDERS } = require('../../config/constants');
const { handleCommandError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Muestra una lista de todos los comandos disponibles'),
    async execute(interaction) {
        try {
            const client = interaction.client;
            const helpEmbed = createBasicEmbed('Comandos de Ayuda', 'Aquí tienes una lista de todos los comandos disponibles');

            COMMAND_FOLDERS.forEach(folder => {
                const folderCommands = client.commands.filter(cmd => cmd.data.name !== 'ayuda' && cmd.folder === folder);
                if (folderCommands.size > 0) {
                    const folderField = folderCommands.map(cmd => `**/${cmd.data.name}**: ${cmd.data.description}`).join('\n');
                    helpEmbed.addFields({ name: folder.charAt(0).toUpperCase() + folder.slice(1), value: folderField });
                }
            });

            helpEmbed.setFooter({ text: 'Bot de Ayuda' });

            if (process.env.LINK_IMAGE_SERVER) {
                helpEmbed.setThumbnail(process.env.LINK_IMAGE_SERVER);
            }

            await interaction.reply({ embeds: [helpEmbed] });
            logger.info('Help command executed successfully', { user: interaction.user.tag });
        } catch (error) {
            logger.error('Error executing help command', error, { user: interaction.user.tag });
            await handleCommandError(interaction, error);
        }
    },
};