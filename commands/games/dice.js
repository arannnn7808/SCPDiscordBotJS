const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dado")
        .setDescription("Tira un dado y sale un número al azar del 1-6"),
    folder: "games",
    cooldown: 3,
    permissions: ["SendMessages"],

    async execute(interaction) {
        try {
            const roll = Math.floor(Math.random() * 6) + 1;
            const imagePath = path.join(__dirname, '..', '..', 'images', 'dices', `${roll}.png`);

            if (!fs.existsSync(imagePath)) {
                throw new Error(`No se encontró la imagen del dado: ${imagePath}`);
            }

            const attachment = new AttachmentBuilder(imagePath, { name: `${roll}.png` });

            const embed = new CustomEmbedBuilder()
                .setTitle('Dados')
                .setDescription('Has tirado un dado de 6 caras')
                .addField('Resultado:', `🎲 ${roll}`, true)
                .setColor("#FFA500")
                .setThumbnail(`attachment://${roll}.png`)
                .build();

            logger.info("Dice roll command executed", {
                user: interaction.user.tag,
                guild: interaction.guild?.name,
                result: roll
            });

            return [{ embeds: [embed], files: [attachment] }];
        } catch (error) {
            logger.error("Error in dice command", {
                error: error.message,
                stack: error.stack,
                user: interaction.user.tag,
                guild: interaction.guild?.name
            });
            await ErrorHandler.handle(error, interaction);
        }
    },
};