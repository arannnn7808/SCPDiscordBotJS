const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");
const database = require("../../data/database");

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
        .setName("nivel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDescription("Gestiona los niveles y XP de los usuarios")
        .addSubcommand(subcommand =>
            subcommand
                .setName("verificar")
                .setDescription("Verifica tu nivel o el de otro usuario")
                .addUserOption(option => option.setName("usuario").setDescription("Usuario a verificar (opcional)"))
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
        ),
    folder: "utility",
    permissions: ["ManageGuild"],
    cooldown: 5,

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case "verificar":
                    return await this.checkLevel(interaction);
                case "clasificacion":
                    return await this.showLeaderboard(interaction);
                case "agregar":
                    return await this.addXP(interaction);
                default:
                    throw new CommandError("INVALID_SUBCOMMAND", `Subcomando desconocido: ${subcommand}`);
            }
        } catch (error) {
            logger.error("Error en el comando de nivel", error, { interaction });
            await ErrorHandler.handle(error, interaction);
        }
    },

    async checkLevel(interaction) {
        // TODO: Implementar lógica de verificación de nivel
        // 1. Obtener el usuario objetivo (el que usa el comando u otro mencionado)
        // 2. Usar database.getUser() para obtener los datos del usuario
        // 3. Crear y enviar un embed con el nivel y XP del usuario
    },

    async showLeaderboard(interaction) {
        // TODO: Implementar lógica de clasificación
        // 1. Usar database.getLeaderboard() para obtener los mejores usuarios
        // 2. Crear y enviar un embed con la información de la clasificación
    },

    async addXP(interaction) {
        // TODO: Implementar lógica de adición de XP
        // 1. Verificar permisos del usuario que ejecuta el comando
        // 2. Obtener el usuario objetivo y la cantidad de XP a añadir
        // 3. Usar database.addXP() para añadir XP al usuario
        // 4. Verificar si el usuario ha subido de nivel
        // 5. Enviar un mensaje de confirmación
    }
};