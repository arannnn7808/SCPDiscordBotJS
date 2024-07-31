const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const logger = require("../../utils/logger");
const database = require("../../data/database");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Gestiona las advertencias de los usuarios")
        .addSubcommand(subcommand =>
            subcommand.setName("add").setDescription("Añade una advertencia a un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
                .addStringOption(option => option.setName("razon").setDescription("Razón de la advertencia").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName("check").setDescription("Verifica las advertencias de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a verificar").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName("remove").setDescription("Elimina una advertencia de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario del que eliminar la advertencia").setRequired(true))
                .addIntegerOption(option => option.setName("warnid").setDescription("ID de la advertencia a eliminar").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName("clear").setDescription("Elimina todas las advertencias de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario del que eliminar todas las advertencias").setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return this.replyOrFollowUp(interaction, { content: "No tienes permisos para gestionar advertencias.", ephemeral: true });
            }

            const subcommand = interaction.options.getSubcommand();
            const targetUser = interaction.options.getUser("usuario");

            const subcommands = {
                add: () => this.addWarn(interaction, targetUser),
                check: () => this.checkWarns(interaction, targetUser),
                remove: () => this.removeWarn(interaction, targetUser),
                clear: () => this.clearWarns(interaction, targetUser)
            };

            await subcommands[subcommand]();
        } catch (error) {
            logger.error("Error inesperado en el comando de warn", error, {interaction});
            await ErrorHandler.handle(error, interaction);
        }
    },

    async replyOrFollowUp(interaction, options) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: options.ephemeral });
            return interaction.editReply(options);
        } else if (interaction.deferred) {
            return interaction.editReply(options);
        } else {
            return interaction.followUp(options);
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

        await this.replyOrFollowUp(interaction, { embeds: [embed] });
        await interaction.followUp({ content: "El usuario ha sido notificado por DM.", ephemeral: true });
    },

    async checkWarns(interaction, targetUser) {
        const warnings = await database.getWarnings(interaction.guild.id, targetUser.id);
        const warningsPerPage = 5;
        const pages = Math.ceil(warnings.length / warningsPerPage);

        if (warnings.length === 0) {
            return this.replyOrFollowUp(interaction, { embeds: [CustomEmbedBuilder.info(`Advertencias de ${targetUser.tag}`, "Este usuario no tiene advertencias")] });
        }

        const generateEmbed = (page) => {
            const embed = new CustomEmbedBuilder()
                .setTitle(`Advertencias de ${targetUser.tag}`)
                .setDescription(`Página ${page + 1} de ${pages}`)
                .setColor("#FFA500");

            const start = page * warningsPerPage;
            const pageWarnings = warnings.slice(start, start + warningsPerPage);

            pageWarnings.forEach((warn) => {
                embed.addField(`Advertencia ${warn.warn_id}`,
                    `**Razón:** ${warn.reason}\n**Moderador:** <@${warn.moderator_id}>\n**Fecha:** ${new Date(warn.timestamp).toLocaleString()}`
                );
            });

            return embed.build();
        };

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('warn_previous')
                    .setLabel('Anterior')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('warn_next')
                    .setLabel('Siguiente')
                    .setStyle(ButtonStyle.Primary)
            );

        let currentPage = 0;

        const initialMessage = await this.replyOrFollowUp(interaction, {
            embeds: [generateEmbed(currentPage)],
            components: [buttons],
            fetchReply: true
        });

        const collector = initialMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'No puedes usar estos botones.', ephemeral: true });
            }

            if (i.customId === 'warn_previous') {
                currentPage = currentPage > 0 ? currentPage - 1 : pages - 1;
            } else if (i.customId === 'warn_next') {
                currentPage = currentPage < pages - 1 ? currentPage + 1 : 0;
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [buttons]
            });
        });

        collector.on('end', () => {
            initialMessage.edit({ components: [] }).catch(error => {
                logger.error("Error removing buttons after collector end", error);
            });
        });

        logger.info(`Warnings checked for ${targetUser.tag} by ${interaction.user.tag}`, {
            warningCount: warnings.length,
            guildId: interaction.guild.id
        });
    },

    async removeWarn(interaction, targetUser) {
        const warnId = interaction.options.getInteger("warnid");
        const removed = await database.removeWarning(interaction.guild.id, targetUser.id, warnId);

        if (removed) {
            logger.info(`Warning #${warnId} removed from ${targetUser.tag} by ${interaction.user.tag}`, {
                guildId: interaction.guild.id
            });
            await this.replyOrFollowUp(interaction, { embeds: [CustomEmbedBuilder.success("Advertencia Eliminada", `Se ha eliminado la advertencia #${warnId} de ${targetUser.tag}`)] });
        } else {
            await this.replyOrFollowUp(interaction, { embeds: [CustomEmbedBuilder.error("Advertencia No Encontrada", "No se encontró la advertencia especificada.")], ephemeral: true });
        }
    },

    async clearWarns(interaction, targetUser) {
        const clearedWarnings = await database.clearWarnings(interaction.guild.id, targetUser.id);

        logger.info(`All warnings cleared for ${targetUser.tag} by ${interaction.user.tag}`, {
            clearedCount: clearedWarnings,
            guildId: interaction.guild.id
        });
        await this.replyOrFollowUp(interaction, { embeds: [CustomEmbedBuilder.success("Advertencias Eliminadas", `Se han eliminado ${clearedWarnings} advertencia(s) de ${targetUser.tag}`)] });
    }
};