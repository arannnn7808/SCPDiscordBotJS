const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require('canvas');
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");
const database = require("../../data/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nivel")
        .setDescription("Gestiona el sistema de niveles")
        .addSubcommand(subcommand =>
            subcommand
                .setName("ver")
                .setDescription("Verifica tu nivel o el de otro usuario")
                .addUserOption(option =>
                    option.setName("usuario")
                        .setDescription("Usuario a verificar (opcional)")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clasificacion")
                .setDescription("Ver la clasificación de XP del servidor")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("agregar")
                .setDescription("Añade XP a un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario al que añadir XP").setRequired(true))
                .addIntegerOption(option => option.setName("xp").setDescription("Cantidad de XP a añadir").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("establecer")
                .setDescription("Establece el XP de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario al que establecer XP").setRequired(true))
                .addIntegerOption(option => option.setName("xp").setDescription("Cantidad de XP a establecer").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("resetear")
                .setDescription("Resetea el nivel de un usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a resetear").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("limpiar")
                .setDescription("Limpia los usuarios inactivos de la base de datos")
        ),
    folder: "utility",
    permissions: ["SendMessages"],
    cooldown: 5,

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            let response;
            switch (subcommand) {
                case "ver":
                    response = await this.checkLevel(interaction);
                    break;
                case "clasificacion":
                    response = await this.showLeaderboard(interaction);
                    break;
                case "agregar":
                    response = await this.addXP(interaction);
                    break;
                case "establecer":
                    response = await this.setXP(interaction);
                    break;
                case "resetear":
                    response = await this.resetUserLevel(interaction);
                    break;
                case "limpiar":
                    response = await this.clearInactiveUsers(interaction);
                    break;
                default:
                    throw new Error(`Subcomando desconocido: ${subcommand}`);
            }

            // Return the response for the command handler to process
            return response;
        } catch (error) {
            logger.error("Error inesperado en el comando de nivel", error, {interaction});
            return ErrorHandler.handle(error, interaction);
        }
    },

    async checkLevel(interaction) {
        const targetUser = interaction.options.getUser("usuario") || interaction.user;
        const userData = await database.getUser(interaction.guild.id, targetUser.id);

        if (!userData) {
            logger.info(`Este usuario no tiene ningún nivel registrado.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id
            });

            return [{content: `${targetUser.toString()} no tiene ningún nivel registrado.`, ephemeral: true}];
        }

        const nextLevelXP = (database.calculateLevel(userData.xp) + 1) * 100;

        // Crear un canvas
        const canvas = createCanvas(400, 200);
        const ctx = canvas.getContext('2d');

        // Dibujar el fondo
        ctx.fillStyle = '#36393f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cargar y dibujar el avatar
        const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 128 }));
        ctx.drawImage(avatar, 25, 25, 150, 150);

        // Dibujar el nombre del usuario
        ctx.font = '30px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(targetUser.username, 200, 50);

        // Dibujar el nivel
        ctx.font = '40px sans-serif';
        ctx.fillStyle = '#7289da';
        ctx.fillText(`Nivel ${userData.level}`, 200, 100);

        // Dibujar el XP
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`XP: ${userData.xp}/${nextLevelXP}`, 200, 140);

        // Convertir el canvas a un buffer
        const buffer = canvas.toBuffer('image/png');

        // Crear un AttachmentBuilder con el buffer
        const attachment = new AttachmentBuilder(buffer, { name: 'level.png' });

        return [{files: [attachment]}];
    },

    async showLeaderboard(interaction) {
        const leaderboard = await database.getLeaderboard(interaction.guild.id);

        if (leaderboard.length === 0) {
            logger.info(`No hay datos de nivel para mostrar en este servidor.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id
            });

            const noDataEmbed = new CustomEmbedBuilder()
                .setTitle(`Sin datos de clasificación`)
                .setDescription(`No hay datos de nivel para mostrar en este servidor.`)
                .setColor("#FFA500")
                .build();

            return [{embeds: [noDataEmbed]}];
        }

        const embed = new CustomEmbedBuilder()
            .setTitle(`Clasificación de XP de ${interaction.guild.name}`)
            .setDescription("Top 10 usuarios con más XP")
            .setColor("#FFA500");

        for (let i = 0; i < leaderboard.length; i++) {
            const user = await interaction.client.users.fetch(leaderboard[i].user_id);
            embed.addField(
                `#${i + 1} ${user.username}`,
                `Nivel: ${leaderboard[i].level} | XP: ${leaderboard[i].xp}`
            );
        }

        return [{embeds: [embed.build()]}];
    },

    async addXP(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return [{content: "No tienes permisos para usar este comando.", ephemeral: true}];
        }

        const targetUser = interaction.options.getUser("usuario");
        const xpToAdd = interaction.options.getInteger("xp");

        if (xpToAdd <= 0) {
            logger.info(`Cantidad de XP inválida para añadir.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                xpToAdd: xpToAdd
            });

            const invalidXPEmbed = new CustomEmbedBuilder()
                .setTitle(`XP Inválido`)
                .setDescription(`La cantidad de XP a añadir debe ser mayor que 0.`)
                .setColor("#FF0000")
                .build();

            return [{embeds: [invalidXPEmbed]}];
        }

        const {xp, level, oldLevel} = await database.addXP(interaction.guild.id, targetUser.id, xpToAdd);

        const embed = new CustomEmbedBuilder()
            .setTitle("XP Añadido")
            .setDescription(`Se ha añadido XP a ${targetUser.toString()}`)
            .addField("XP Añadido", xpToAdd.toString(), true)
            .addField("XP Total", xp.toString(), true)
            .addField("Nivel Actual", level.toString(), true)
            .setColor("#00FF00");

        if (level > oldLevel) {
            embed.addField("¡Subida de Nivel!", `${targetUser.username} ha subido al nivel ${level}!`);
        }

        return [{embeds: [embed.build()]}];
    },

    async setXP(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return [{content: "No tienes permisos para usar este comando.", ephemeral: true}];
        }

        const targetUser = interaction.options.getUser("usuario");
        const xpToSet = interaction.options.getInteger("xp");

        if (xpToSet < 0) {
            logger.info(`Cantidad de XP inválida para establecer.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                xpToSet: xpToSet
            });

            const invalidXPEmbed = new CustomEmbedBuilder()
                .setTitle(`XP Inválido`)
                .setDescription(`La cantidad de XP a establecer no puede ser negativa.`)
                .setColor("#FF0000")
                .build();

            return [{embeds: [invalidXPEmbed]}];
        }

        const {xp, level, changes} = await database.setXP(interaction.guild.id, targetUser.id, xpToSet);

        const embed = new CustomEmbedBuilder()
            .setTitle("XP Establecido")
            .setDescription(`Se ha establecido el XP de ${targetUser.toString()}`)
            .addField("XP Establecido", xp.toString(), true)
            .addField("Nivel Actual", level.toString(), true)
            .setColor("#00FF00")
            .build();

        return [{embeds: [embed]}];
    },

    async resetUserLevel(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return [{content: "No tienes permisos para usar este comando.", ephemeral: true}];
        }

        const targetUser = interaction.options.getUser("usuario");
        const reset = await database.resetUserLevel(interaction.guild.id, targetUser.id);

        if (reset) {
            const embed = new CustomEmbedBuilder()
                .setTitle("Nivel Reseteado")
                .setDescription(`Se ha reseteado el nivel de ${targetUser.toString()}`)
                .setColor("#00FF00")
                .build();

            return [{embeds: [embed]}];
        } else {
            logger.info(`No se pudo resetear el nivel del usuario.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                targetUserId: targetUser.id
            });

            const noResetEmbed = new CustomEmbedBuilder()
                .setTitle(`Reseteo Fallido`)
                .setDescription(`No se pudo resetear el nivel del usuario. Es posible que no tuviera un nivel registrado.`)
                .setColor("#FFA500")
                .build();

            return [{embeds: [noResetEmbed]}];
        }
    },

    async clearInactiveUsers(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return [{content: "No tienes permisos para usar este comando.", ephemeral: true}];
        }

        try {
            logger.debug(`Starting clearInactiveUsers for guild ${interaction.guild.id}`);

            // Fetch all guild members
            logger.debug(`Fetching guild members for guild ${interaction.guild.id}`);
            await interaction.guild.members.fetch();
            const activeUserIds = interaction.guild.members.cache.map(member => member.id);
            logger.debug(`Fetched ${activeUserIds.length} active user IDs`);

            // Clear inactive users from the database
            logger.debug(`Calling database.clearInactiveUsers for guild ${interaction.guild.id}`);
            const clearedCount = await database.clearInactiveUsers(interaction.guild.id, activeUserIds);
            logger.debug(`Cleared ${clearedCount} inactive users`);

            const embed = new CustomEmbedBuilder()
                .setTitle("Limpieza de Usuarios Inactivos")
                .setDescription(`Se han limpiado ${clearedCount} usuarios inactivos de la base de datos.`)
                .setColor("#00FF00")
                .build();

            logger.info(`Usuarios inactivos limpiados.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                clearedCount: clearedCount
            });

            return [{embeds: [embed]}];
        } catch (error) {
            logger.error("Error al limpiar usuarios inactivos", error, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                errorMessage: error.message,
                errorStack: error.stack
            });

            const errorEmbed = new CustomEmbedBuilder()
                .setTitle("Error")
                .setDescription(`Ocurrió un error al limpiar usuarios inactivos: ${error.message}`)
                .setColor("#FF0000")
                .build();

            return [{embeds: [errorEmbed], ephemeral: true}];
        }
    }
}