const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Elimina una cantidad específica de mensajes del canal.")
        .addIntegerOption(option =>
            option.setName("cantidad")
                .setDescription("Número de mensajes a eliminar (entre 1 y 100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    folder: "moderation",
    permissions: ["ManageMessages"],
    cooldown: 5,

    async execute(interaction) {
        try {
            // Check bot permissions
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return await this.replyOrEdit(interaction, {
                    embeds: [CustomEmbedBuilder.error(
                        "Permisos Insuficientes",
                        "El bot no tiene permiso para eliminar mensajes en este canal."
                    )]
                });
            }

            const amount = interaction.options.getInteger("cantidad");
            const channel = interaction.channel;

            // Send a response before deleting messages
            await this.replyOrEdit(interaction, {
                embeds: [new CustomEmbedBuilder()
                    .setTitle("Eliminando Mensajes")
                    .setDescription(`Intentando eliminar ${amount} mensajes...`)
                    .setColor("#FFA500")
                    .build()
                ],
                ephemeral: true
            });

            // Delete messages
            const messages = await channel.bulkDelete(amount, true).catch(error => {
                if (error.code === 50034) {
                    throw new Error("No se pueden eliminar mensajes con más de 14 días de antigüedad.");
                }
                throw error;
            });

            logger.info(`${interaction.user.tag} eliminó ${messages.size} mensajes en #${channel.name}`, {
                commandName: 'clear',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                channelId: channel.id
            });

            // Send a follow-up message with the result
            await interaction.followUp({
                embeds: [new CustomEmbedBuilder()
                    .setTitle("Mensajes Eliminados")
                    .setDescription(`Se han eliminado ${messages.size} mensajes.`)
                    .setColor("#00FF00")
                    .build()
                ],
                ephemeral: true
            });

        } catch (error) {
            logger.error("Error en el comando clear", error);

            let errorMessage = "Ha ocurrido un error inesperado al eliminar los mensajes.";
            if (error.message === "No se pueden eliminar mensajes con más de 14 días de antigüedad.") {
                errorMessage = error.message;
            }

            await interaction.followUp({
                embeds: [CustomEmbedBuilder.error("Error al Eliminar Mensajes", errorMessage)],
                ephemeral: true
            });
        }
    },

    async replyOrEdit(interaction, payload) {
        if (interaction.deferred) {
            return await interaction.editReply(payload);
        } else if (interaction.replied) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply({ ...payload, ephemeral: true });
        }
    }
};