const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario que deseas expulsar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón de la expulsión')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon');

        // Verificar si el usuario tiene el rol necesario para expulsar
        if (!interaction.member.roles.cache.has(process.env.MEGA_STAFF_ROLE)) {
            return await interaction.reply({ content: 'No tienes permisos para expulsar usuarios.', ephemeral: true });
        }

        try {
            await interaction.guild.members.kick(user, { reason });

            await user.send(`Has sido expulsado de ${interaction.guild.name} por: ${reason}`);

            await interaction.reply({ content: `Usuario ${user.tag} expulsado correctamente por: ${reason}`, ephemeral: true });
        } catch (error) {
            console.error('Error al intentar expulsar al usuario:', error);
            await interaction.reply({ content: 'Hubo un error al intentar expulsar al usuario.\nLos errores pueden ser:\nEs un bot, se ha expulsado y no puede recivir mensajes al MD(Si es esta opción se ha expulsado pero no le ha llegado la razón)\nNo tienes permisos para expulsar', ephemeral: true });
        }
    },
};
