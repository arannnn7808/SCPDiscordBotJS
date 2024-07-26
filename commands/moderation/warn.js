const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const database = require("../../data/database");
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
        .setName("warn")
        .setDescription("Gestiona las advertencias de los usuarios")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Añade una advertencia a un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
                .addStringOption(option => option.setName("razon").setDescription("Razón de la advertencia").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("check")
                .setDescription("Verifica las advertencias de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a verificar").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Elimina una advertencia de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario del que eliminar la advertencia").setRequired(true))
                .addIntegerOption(option => option.setName("warnid").setDescription("ID de la advertencia a eliminar").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clear")
                .setDescription("Elimina todas las advertencias de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario del que eliminar todas las advertencias").setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                throw new CommandError(
                    "MISSING_PERMISSIONS",
                    "No tienes permiso para gestionar advertencias.",
                    "info"
                );
            }

            const subcommand = interaction.options.getSubcommand();
            const targetUser = interaction.options.getUser("usuario");

            switch (subcommand) {
                case "add":
                    return await this.addWarn(interaction, targetUser);
                case "check":
                    return await this.checkWarns(interaction, targetUser);
                case "remove":
                    return await this.removeWarn(interaction, targetUser);
                case "clear":
                    return await this.clearWarns(interaction, targetUser);
                default:
                    throw new CommandError("INVALID_SUBCOMMAND", `Subcomando desconocido: ${subcommand}`);
            }
        } catch (error) {
            logger.error(`Error in warn command`, error, {
                subcommand: interaction.options.getSubcommand(),
                targetUser: interaction.options.getUser("usuario")?.id,
                executor: interaction.user.id
            });
            await ErrorHandler.handle(error, interaction);
        }
    },

    async addWarn(interaction, targetUser) {
        const reason = interaction.options.getString("razon");
        const { id, warnId } = await database.addWarning(interaction.guild.id, targetUser.id, reason, interaction.user.id);
        const warnings = await database.getWarnings(interaction.guild.id, targetUser.id);

        logger.info(`User ${targetUser.tag} was warned by ${interaction.user.tag}`, {
            warningId: id,
            warnId,
            reason,
            guildId: interaction.guild.id
        });

        const embed = new CustomEmbedBuilder()
            .setTitle("⚠️ Advertencia Emitida")
            .setDescription(`Se ha advertido a ${targetUser.toString()}`)
            .addField("Usuario", targetUser.tag, true)
            .addField("Moderador", interaction.user.tag, true)
            .addField("Razón", reason)
            .addField("Advertencias Totales", warnings.length.toString(), true)
            .addField("ID de la Advertencia", warnId.toString(), true)
            .setColor("#FFA500")
            .setTimestamp()
            .build();

        const dmEmbed = new CustomEmbedBuilder()
            .setTitle("⚠️ Has recibido una advertencia")
            .setDescription(`Has sido advertido en ${interaction.guild.name}`)
            .addField("Razón", reason)
            .addField("Moderador", interaction.user.tag)
            .setColor("#FFA500")
            .setTimestamp()
            .build();

        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            logger.warn(`Could not send DM to ${targetUser.tag}`);
        });

        return [
            { embeds: [embed] },
            { content: "El usuario ha sido notificado por DM.", ephemeral: true }
        ];
    },

    async checkWarns(interaction, targetUser) {
        const warnings = await database.getWarnings(interaction.guild.id, targetUser.id);

        const embed = new CustomEmbedBuilder()
            .setTitle(`Advertencias de ${targetUser.tag}`)
            .setDescription(warnings.length ? `Este usuario tiene ${warnings.length} advertencia(s)` : "Este usuario no tiene advertencias")
            .setColor(warnings.length ? "#FFA500" : "#00FF00");

        warnings.forEach((warn) => {
            embed.addField(`Advertencia ${warn.warn_id}`,
                `**Razón:** ${warn.reason}\n**Moderador:** <@${warn.moderator_id}>\n**Fecha:** ${new Date(warn.timestamp).toLocaleString()}`
            );
        });

        logger.info(`Warnings checked for ${targetUser.tag} by ${interaction.user.tag}`, {
            warningCount: warnings.length,
            guildId: interaction.guild.id
        });
        return [{ embeds: [embed.build()] }];
    },

    async removeWarn(interaction, targetUser) {
        const warnId = interaction.options.getInteger("warnid");
        const removed = await database.removeWarning(interaction.guild.id, targetUser.id, warnId);

        if (removed) {
            logger.info(`Warning #${warnId} removed from ${targetUser.tag} by ${interaction.user.tag}`, {
                guildId: interaction.guild.id
            });
            const embed = new CustomEmbedBuilder()
                .setTitle("Advertencia Eliminada")
                .setDescription(`Se ha eliminado la advertencia #${warnId} de ${targetUser.tag}`)
                .setColor("#00FF00")
                .build();
            return [{ embeds: [embed] }];
        } else {
            throw new CommandError("WARNING_NOT_FOUND", "No se encontró la advertencia especificada.");
        }
    },

    async clearWarns(interaction, targetUser) {
        const clearedWarnings = await database.clearWarnings(interaction.guild.id, targetUser.id);

        logger.info(`All warnings cleared for ${targetUser.tag} by ${interaction.user.tag}`, {
            clearedCount: clearedWarnings,
            guildId: interaction.guild.id
        });
        const embed = new CustomEmbedBuilder()
            .setTitle("Advertencias Eliminadas")
            .setDescription(`Se han eliminado ${clearedWarnings} advertencia(s) de ${targetUser.tag}`)
            .setColor("#00FF00")
            .build();
        return [{ embeds: [embed] }];
    }
};