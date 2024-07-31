const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");

const responses = [
    "Es cierto", "Definitivamente es así", "Sin duda", "Sí, definitivamente", "Puedes confiar en ello",
    "Como yo lo veo, sí", "Probablemente", "Las perspectivas son buenas", "Sí", "Las señales apuntan a que sí",
    "Respuesta confusa, intenta de nuevo", "Pregunta de nuevo más tarde", "Mejor no decirte ahora",
    "No puedo predecirlo ahora", "Concéntrate y pregunta de nuevo", "No cuentes con ello", "Mi respuesta es no",
    "Mis fuentes dicen que no", "Las perspectivas no son muy buenas", "Muy dudoso"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Hazle una pregunta a la bola 8ball para saber tu respuesta.")
        .addStringOption((option) =>
            option.setName("pregunta").setDescription("Haz tu pregunta").setRequired(true).setMaxLength(2000)
        ),
    folder: "games",
    cooldown: 3,
    async execute(interaction) {
        try {
            const question = interaction.options.getString("pregunta");
            const response = responses[Math.floor(Math.random() * responses.length)];

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('La bola 🎱 mágica dice...')
                .setThumbnail("https://media.tenor.com/jkhI4ah_1EMAAAAj/eightball.gif")
                .addFields(
                    { name: '❓ Tu pregunta', value: question },
                    { name: '📃 Respuesta', value: response }
                );

            await interaction.reply({ embeds: [embed] });
            logger.info(`User ${interaction.user.tag} used 8ball command`);
        } catch (error) {
            logger.error(`Error in 8ball command: ${error.message}`);
            ErrorHandler.handle(error, interaction);
        }
    }
};