const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");
const database = require("../../data/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nivel")
        .setDescription("Gestiona el sistema de niveles")
        .addSubcommand(subcommand =>
            subcommand.setName("ver").setDescription("Verifica tu nivel o el de otro usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a verificar (opcional)").setRequired(false))
        )
        .addSubcommand(subcommand => subcommand.setName("clasificacion").setDescription("Ver la clasificación de XP del servidor"))
        .addSubcommand(subcommand => subcommand.setName("agregar").setDescription("Añade XP a un usuario")
            .addUserOption(option => option.setName("usuario").setDescription("Usuario al que añadir XP").setRequired(true))
            .addIntegerOption(option => option.setName("xp").setDescription("Cantidad de XP a añadir").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("establecer").setDescription("Establece el XP de un usuario")
            .addUserOption(option => option.setName("usuario").setDescription("Usuario al que establecer XP").setRequired(true))
            .addIntegerOption(option => option.setName("xp").setDescription("Cantidad de XP a establecer").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("resetear").setDescription("Resetea el nivel de un usuario")
            .addUserOption(option => option.setName("usuario").setDescription("Usuario a resetear").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("limpiar").setDescription("Limpia los usuarios inactivos de la base de datos")),
    folder: "utility",
    permissions: ["SendMessages"],
    cooldown: 5,

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const subcommands = {
                ver: this.checkLevel,
                clasificacion: this.showLeaderboard,
                agregar: this.addXP,
                establecer: this.setXP,
                resetear: this.resetUserLevel,
                limpiar: this.clearInactiveUsers
            };
            const response = await subcommands[subcommand].call(this, interaction);

            if (Array.isArray(response) && response.length > 0) {
                if (interaction.deferred) {
                    await interaction.editReply(response[0]);
                } else {
                    await interaction.reply(response[0]);
                }
            } else {
                logger.warn(`Unexpected response from subcommand ${subcommand}`, {response});
                await interaction.reply({content: "Ocurrió un error inesperado.", ephemeral: true});
            }
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
            return [{
                embeds: [new CustomEmbedBuilder()
                    .setTitle(`Sin datos de nivel`)
                    .setDescription(`${targetUser.toString()} no tiene ningún nivel registrado.`)
                    .setColor("#FFA500")
                    .build()],
                ephemeral: true
            }];
        }

        const currentLevelXP = this.getXPForLevel(userData.level);
        const nextLevelXP = this.getXPForLevel(userData.level + 1);
        const xpForNextLevel = nextLevelXP - currentLevelXP;
        const xpInCurrentLevel = userData.xp - currentLevelXP;
        const progressPercentage = Math.min(Math.floor((xpInCurrentLevel / xpForNextLevel) * 100), 100);
        const progressBar = this.generateProgressBar(progressPercentage);

        const embed = new CustomEmbedBuilder()
            .setTitle(`Nivel de ${targetUser.username}`)
            .setDescription(`Aquí están los detalles del nivel de ${targetUser.toString()}:`)
            .addField("Nivel", userData.level.toString(), true)
            .addField("XP Total", userData.xp.toString(), true)
            .addField("XP para el siguiente nivel", `${xpInCurrentLevel}/${xpForNextLevel}`, true)
            .addField("Progreso", `${progressBar} ${progressPercentage}%`)
            .setColor("#FFA500")
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

        return [{ embeds: [embed.build()], ephemeral: true }];
    },

    getXPForLevel(level) {
        return Math.floor(100 * (Math.pow(level, 2)));
    },

    generateProgressBar(percentage) {
        const filledSquares = Math.floor(percentage / 10);
        const emptySquares = 10 - filledSquares;
        return '█'.repeat(filledSquares) + '░'.repeat(emptySquares);
    },
    
    async showLeaderboard(interaction) {
        const leaderboard = await database.getLeaderboard(interaction.guild.id);
        const entriesPerPage = 5;
        const pages = Math.ceil(leaderboard.length / entriesPerPage);

        if (leaderboard.length === 0) {
            return [{embeds: [CustomEmbedBuilder.warning("Sin datos de clasificación", "No hay datos de nivel para mostrar en este servidor.")]}];
        }

        let currentPage = 0;

        const generateEmbed = async (page) => {
            const embed = new CustomEmbedBuilder()
                .setTitle(`Clasificación de XP de ${interaction.guild.name}`)
                .setDescription(`Página ${page + 1} de ${pages}`)
                .setColor("#FFA500");

            const start = page * entriesPerPage;
            const pageEntries = leaderboard.slice(start, start + entriesPerPage);

            for (const entry of pageEntries) {
                const user = await interaction.client.users.fetch(entry.user_id);
                embed.addField(
                    `#${start + pageEntries.indexOf(entry) + 1} ${user.username}`,
                    `Nivel: ${entry.level} | XP: ${entry.xp}`
                );
            }

            return embed.build();
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Anterior')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Siguiente')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === pages - 1)
            );
        };

        const initialEmbed = await generateEmbed(currentPage);
        const initialButtons = pages > 1 ? generateButtons(currentPage) : null;

        const initialResponse = [
            {embeds: [initialEmbed], components: initialButtons ? [initialButtons] : [], fetchReply: true}
        ];

        if (pages > 1) {
            const message = await interaction.channel.send(initialResponse[0]);
            const collector = message.createMessageComponentCollector({time: 60000});

            collector.on('collect', async i => {
                if (i.user.id === interaction.user.id) {
                    currentPage = i.customId === 'previous' ? Math.max(0, currentPage - 1) : Math.min(pages - 1, currentPage + 1);
                    await i.update({
                        embeds: [await generateEmbed(currentPage)],
                        components: [generateButtons(currentPage)]
                    });
                }
            });

            collector.on('end', () => {
                message.edit({components: []}).catch(error => {
                    logger.error("Error removing buttons after collector end", error);
                });
            });
        }

        return initialResponse;
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
            return [{
                embeds: [new CustomEmbedBuilder()
                    .setTitle(`XP Inválido`)
                    .setDescription(`La cantidad de XP a añadir debe ser mayor que 0.`)
                    .setColor("#FF0000")
                    .build()]
            }];
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
            return [{
                embeds: [new CustomEmbedBuilder()
                    .setTitle(`XP Inválido`)
                    .setDescription(`La cantidad de XP a establecer no puede ser negativa.`)
                    .setColor("#FF0000")
                    .build()]
            }];
        }

        const {xp, level} = await database.setXP(interaction.guild.id, targetUser.id, xpToSet);
        return [{
            embeds: [new CustomEmbedBuilder()
                .setTitle("XP Establecido")
                .setDescription(`Se ha establecido el XP de ${targetUser.toString()}`)
                .addField("XP Establecido", xp.toString(), true)
                .addField("Nivel Actual", level.toString(), true)
                .setColor("#00FF00")
                .build()]
        }];
    },

    async resetUserLevel(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return [{content: "No tienes permisos para usar este comando.", ephemeral: true}];
        }

        const targetUser = interaction.options.getUser("usuario");
        const reset = await database.resetUserLevel(interaction.guild.id, targetUser.id);

        if (reset) {
            return [{
                embeds: [new CustomEmbedBuilder()
                    .setTitle("Nivel Reseteado")
                    .setDescription(`Se ha reseteado el nivel de ${targetUser.toString()}`)
                    .setColor("#00FF00")
                    .build()]
            }];
        } else {
            logger.info(`No se pudo resetear el nivel del usuario.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                targetUserId: targetUser.id
            });
            return [{
                embeds: [new CustomEmbedBuilder()
                    .setTitle(`Reseteo Fallido`)
                    .setDescription(`No se pudo resetear el nivel del usuario. Es posible que no tuviera un nivel registrado.`)
                    .setColor("#FFA500")
                    .build()]
            }];
        }
    },

    async clearInactiveUsers(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return [{content: "No tienes permisos para usar este comando.", ephemeral: true}];
        }

        try {
            logger.debug(`Starting clearInactiveUsers for guild ${interaction.guild.id}`);

            // Get all users from the database for this guild
            const dbUsers = await database.getAllUsers(interaction.guild.id);

            let removedCount = 0;
            for (const dbUser of dbUsers) {
                try {
                    // Try to fetch the user from the guild
                    await interaction.guild.members.fetch(dbUser.user_id);
                } catch (fetchError) {
                    if (fetchError.code === 10007) { // Unknown Member error
                        // User is not in the guild, remove from database
                        await database.removeUser(interaction.guild.id, dbUser.user_id);
                        removedCount++;
                        logger.debug(`Removed user ${dbUser.user_id} from guild ${interaction.guild.id} database`);
                    } else {
                        logger.error(`Error fetching member ${dbUser.user_id}`, fetchError);
                    }
                }
            }

            // Get the actual member count
            const memberCount = await interaction.guild.members.fetch().then(members => members.size);

            logger.info(`Usuarios inactivos limpiados.`, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                clearedCount: removedCount
            });

            const responseEmbed = new CustomEmbedBuilder()
                .setTitle("Limpieza de Usuarios Inactivos")
                .setDescription(`Se han limpiado ${removedCount} usuarios inactivos de la base de datos.\nMiembros activos en el servidor: ${memberCount}`)
                .setColor("#00FF00")
                .build();

            return [{embeds: [responseEmbed], ephemeral: true}];
        } catch (error) {
            logger.error("Error al limpiar usuarios inactivos", error, {
                commandName: 'nivel',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                errorMessage: error.message,
                errorStack: error.stack
            });

            const errorEmbed = new CustomEmbedBuilder()
                .setTitle("Error al Limpiar Usuarios Inactivos")
                .setDescription("Ocurrió un error al intentar limpiar los usuarios inactivos. Por favor, inténtalo de nuevo más tarde.")
                .setColor("#FF0000")
                .build();

            return [{embeds: [errorEmbed], ephemeral: true}];
        }
    }
};