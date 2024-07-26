const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");

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
        .setName("timeout")
        .setDescription("Aplica un timeout a un usuario del servidor")
        .addUserOption((option) =>
            option
                .setName("usuario")
                .setDescription("Usuario al que aplicar el timeout")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("duracion")
                .setDescription("Duración del timeout en minutos")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320) // 4 weeks max
        )
        .addStringOption((option) =>
            option.setName("razon").setDescription("Razón del timeout").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    folder: "moderation",
    permissions: ["ModerateMembers"],
    cooldown: 5,
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getMember("usuario");
            const duration = interaction.options.getInteger("duracion");
            const reason = interaction.options.getString("razon");

            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                throw new CommandError(
                    "MISSING_PERMISSIONS",
                    "No tienes permiso para aplicar timeouts en este servidor."
                );
            }

            if (!targetUser) {
                throw new CommandError(
                    "USER_NOT_FOUND",
                    "El usuario especificado no está en el servidor."
                );
            }

            if (targetUser.id === interaction.guild.ownerId) {
                throw new CommandError(
                    "CANNOT_TIMEOUT_OWNER",
                    "No puedes aplicar un timeout al dueño del servidor.",
                    "info"
                );
            }

            if (
                interaction.guild.members.me.roles.highest.position <=
                targetUser.roles.highest.position
            ) {
                throw new CommandError(
                    "BOT_HIERARCHY_ERROR",
                    "No puedo aplicar un timeout a este usuario. Su rol es superior o igual al mío.",
                    "info"
                );
            }

            if (
                interaction.member.roles.highest.position <=
                targetUser.roles.highest.position
            ) {
                throw new CommandError(
                    "USER_HIERARCHY_ERROR",
                    "No puedes aplicar un timeout a este usuario. Su rol es superior o igual al tuyo.",
                    "info"
                );
            }

            await targetUser.timeout(duration * 60 * 1000, reason);

            logger.info(
                `User ${targetUser.user.tag} was timed out for ${duration} minutes by ${interaction.user.tag}`,
                {
                    reason: reason,
                    guildId: interaction.guild.id,
                }
            );

            const successEmbed = new CustomEmbedBuilder()
                .setTitle("Timeout Aplicado")
                .setDescription(`Se ha aplicado un timeout a ${targetUser.user.tag}`)
                .addField("Duración", `${duration} minutos`, true)
                .addField("Razón", reason)
                .setColor("#FFA500")
                .setTimestamp()
                .build();

            const dmEmbed = new CustomEmbedBuilder()
                .setTitle("Has recibido un timeout")
                .setDescription(`Se te ha aplicado un timeout en ${interaction.guild.name}`)
                .addField("Duración", `${duration} minutos`, true)
                .addField("Razón", reason)
                .setColor("#FFA500")
                .setTimestamp()
                .build();

            await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                logger.warn(`Could not send DM to ${targetUser.user.tag}`);
            });

            return [
                { embeds: [successEmbed] },
                { content: "El usuario ha sido notificado por DM.", ephemeral: true }
            ];
        } catch (error) {
            logger.error("Error in timeout command", error, { interaction });
            await ErrorHandler.handle(error, interaction);
        }
    },
};