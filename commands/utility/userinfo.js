const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');
const { handleCommandError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Obtén información sobre un usuario.')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario del que quieres obtener información'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    cooldown: 5,
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                return await interaction.reply({
                    content: 'No se pudo encontrar al usuario en este servidor.',
                    ephemeral: true
                });
            }

            if (!member) {
                throw new Error('USUARIO_NO_ENCONTRADO');
            }

            const roles = member.roles.cache
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, -1);

            const embed = new EmbedBuilder()
                .setTitle(`Información de Usuario: ${member.user.tag}`)
                .setThumbnail(member.user.displayAvatarURL({dynamic: true, size: 256}))
                .setColor(member.displayHexColor || '#00FF00')
                .addFields(
                    {name: 'ID', value: member.user.id, inline: true},
                    {name: 'Apodo', value: member.nickname || 'Ninguno', inline: true},
                    {
                        name: 'Cuenta Creada',
                        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: 'Se Unió al Servidor',
                        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                        inline: true
                    },
                    {name: 'Roles', value: roles.length ? roles.join(', ') : 'Ninguno'},
                    {name: 'Es un Bot', value: member.user.bot ? 'Sí' : 'No', inline: true}
                )
                .setFooter({text: `Solicitado por ${interaction.user.tag}`})
                .setTimestamp();

            await interaction.reply({embeds: [embed]});
        } catch (error) {
            logger.error('Error executing userinfo command', error);
            await handleCommandError(interaction, error);
        }
    }
}