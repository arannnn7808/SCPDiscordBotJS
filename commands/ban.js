const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario que deseas banear')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del ban')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon');

        
        if (!interaction.member.roles.cache.has(process.env.MEGA_STAFF_ROLE)) {
            return await interaction.reply({ content: 'No tienes permisos para banear usuarios.', ephemeral: true });
        }

        try {
            await interaction.guild.members.ban(user, { reason });

            await user.send(`Has sido baneado de ${interaction.guild.name} por: ${reason}`);

            await interaction.reply({ content: `Usuario ${user.tag} baneado correctamente por: ${reason}`, ephemeral: true });
        } catch (error) {
            console.error('Error al intentar banear al usuario:', error);
            await interaction.reply({ content: 'Hubo un error al intentar banear al usuario.\nLos errores pueden ser:\nEs un bot, se ha baneado y no puede recivir mensajes al MD(Si es esta opción se ha baneado pero no le ha llegado la razón)\nNo tienes permisos para banear', ephemeral: true });
        }
    },
};
