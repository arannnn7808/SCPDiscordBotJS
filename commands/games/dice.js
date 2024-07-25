const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");
const fs = require('fs');
const path = require('path');

class CommandError extends Error {
    constructor(code, message, level = "error") {
        super(message);
        this.name = "CommandError";
        this.code = code;
        this.level = level;
    }
}

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
                throw new CommandError(
                    "IMAGE_NOT_FOUND",
                    `No se encontró la imagen del dado: ${imagePath}`,
                    "error"
                );
            }

            const attachment = new AttachmentBuilder(imagePath, { name: `${roll}.png` });

            const embed = new CustomEmbedBuilder()
                .setTitle('Dados')
                .setDescription('Has tirado un dado de 6 caras')
                .addField('Resultado:', `🎲 ${roll}`, true)
                .setColor("#FFA500")
                .setThumbnail(`attachment://${roll}.png`)
                .build();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

            logger.info("Dice roll command executed", {
                user: interaction.user.tag,
                guild: interaction.guild?.name,
                result: roll
            });
        } catch (error) {
            if (error instanceof CommandError) {
                logger.error(`Dice command error: ${error.message}`, {
                    code: error.code,
                    level: error.level,
                    user: interaction.user.tag,
                    guild: interaction.guild?.name
                });
            } else {
                logger.error(`Unexpected error in dice command: ${error.message}`, {
                    error,
                    user: interaction.user.tag,
                    guild: interaction.guild?.name
                });
            }
            await ErrorHandler.handle(error, interaction);
        }
    },
};