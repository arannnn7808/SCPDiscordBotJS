const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dado")
        .setDescription("Tira un dado y sale un numero al azar del 1-6"),
    folder: "games",
    cooldown: 3,
    async execute(interaction) {
        try {
            const roll = Math.floor(Math.random() * 6) + 1;
            const imagePath = path.join(__dirname, '..', '..', 'images', 'dices', `${roll}.png`);

            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image not found: ${imagePath}`);
            }

            const attachment = new AttachmentBuilder(imagePath, { name: `${roll}.png` });

            const embed = new EmbedBuilder()
                .setTitle('Dados')
                .setDescription(`Has tirado un dado de 6 caras`)
                .addFields({ name: 'Respuesta:', value: `🎲 ${roll}`, inline: true })
                .setColor("#FFA500")
                .setThumbnail(`attachment://${roll}.png`);

            await interaction.editReply({ embeds: [embed], files: [attachment] });
            logger.info(`Roll command executed by ${interaction.user.tag}`, {
                result: roll
            });
        } catch (error) {
            await ErrorHandler.handle(error, interaction);
        }
    },
};