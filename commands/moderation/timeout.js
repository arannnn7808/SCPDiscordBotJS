const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Aplica un timeout a un usuario del servidor")
        .addUserOption((option) =>
            option.setName("usuario").setDescription("Usuario al que aplicar el timeout").setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName("duracion").setDescription("Duración del timeout en minutos").setRequired(true).setMinValue(1).setMaxValue(40320)
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
                return [{ content: "No tienes permiso para aplicar timeouts en este servidor.", ephemeral: true }];
            }

            if (!targetUser) {
                return [{ content: "El usuario especificado no está en el servidor.", ephemeral: true }];
            }

            if (targetUser.id === interaction.guild.ownerId) {
                return [{ content: "No puedes aplicar un timeout al dueño del servidor.", ephemeral: true }];
            }

            if (interaction.guild.members.me.roles.highest.position <= targetUser.roles.highest.position) {
                return [{ content: "No puedo aplicar un timeout a este usuario. Su rol es superior o igual al mío.", ephemeral: true }];
            }

            if (interaction.member.roles.highest.position <= targetUser.roles.highest.position) {
                return [{ content: "No puedes aplicar un timeout a este usuario. Su rol es superior o igual al tuyo.", ephemeral: true }];
            }

            await targetUser.timeout(duration * 60 * 1000, reason);

            logger.info(
                `User ${targetUser.user.tag} was timed out for ${duration} minutes by ${interaction.user.tag}`,
                { reason: reason, guildId: interaction.guild.id }
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