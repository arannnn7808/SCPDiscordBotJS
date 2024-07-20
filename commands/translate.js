const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { translate } = require('@vitalets/google-translate-api');

const banderas = {
    'es': '🇪🇸', 'en': '🇺🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹', 'pt': '🇵🇹',
    'ja': '🇯🇵', 'zh': '🇨🇳', 'ru': '🇷🇺', 'ko': '🇰🇷', 'tr': '🇹🇷', 'pl': '🇵🇱',
    'nl': '🇳🇱', 'sv': '🇸🇪', 'no': '🇳🇴', 'da': '🇩🇰', 'fi': '🇫🇮', 'el': '🇬🇷',
    'hu': '🇭🇺', 'cs': '🇨🇿', 'ro': '🇷🇴', 'bg': '🇧🇬', 'hr': '🇭🇷', 'sk': '🇸🇰',
    'sl': '🇸🇮', 'spa': '🇪🇸', 'eng': '🇺🇸', 'fra': '🇫🇷', 'deu': '🇩🇪', 'ita': '🇮🇹',
    'por': '🇵🇹', 'jpn': '🇯🇵', 'zho': '🇨🇳', 'rus': '🇷🇺', 'kor': '🇰🇷', 'tur': '🇹🇷',
    'pol': '🇵🇱', 'nld': '🇳🇱', 'swe': '🇸🇪', 'nor': '🇳🇴', 'dan': '🇩🇰', 'fin': '🇫🇮',
    'ell': '🇬🇷', 'hun': '🇭🇺', 'ces': '🇨🇿', 'ron': '🇷🇴', 'bul': '🇧🇬', 'hrv': '🇭🇷',
    'slk': '🇸🇰', 'slv': '🇸🇮'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('traducir')
        .setDescription('Traduce un texto a otro idioma')
        .addStringOption(option =>
            option.setName('texto')
                .setDescription('El texto que quieres traducir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('idioma')
                .setDescription('Selecciona el idioma al que quieres traducir')
                .setRequired(true)
                .addChoices(
                    { name: '🇪🇸 Español', value: 'es' },
                    { name: '🇺🇸 English', value: 'en' },
                    { name: '🇫🇷 Français', value: 'fr' },
                    { name: '🇩🇪 Deutsch', value: 'de' },
                    { name: '🇮🇹 Italiano', value: 'it' },
                    { name: '🇵🇹 Português', value: 'pt' },
                    { name: '🇯🇵 日本語', value: 'ja' },
                    { name: '🇨🇳 中文 (简体)', value: 'zh-CN' },
                    { name: '🇷🇺 Русский', value: 'ru' },
                    { name: '🇰🇷 한국어', value: 'ko' },
                    { name: '🇹🇷 Türkçe', value: 'tr' },
                    { name: '🇵🇱 Polski', value: 'pl' },
                    { name: '🇳🇱 Nederlands', value: 'nl' },
                    { name: '🇸🇪 Svenska', value: 'sv' },
                    { name: '🇳🇴 Norsk', value: 'no' },
                    { name: '🇩🇰 Dansk', value: 'da' },
                    { name: '🇫🇮 Suomi', value: 'fi' },
                    { name: '🇬🇷 Ελληνικά', value: 'el' },
                    { name: '🇭🇺 Magyar', value: 'hu' },
                    { name: '🇨🇿 Čeština', value: 'cs' },
                    { name: '🇷🇴 Română', value: 'ro' },
                    { name: '🇧🇬 Български', value: 'bg' },
                    { name: '🇭🇷 Hrvatski', value: 'hr' },
                    { name: '🇸🇰 Slovenčina', value: 'sk' },
                    { name: '🇸🇮 Slovenščina', value: 'sl' }
                )),
    async execute(interaction) {
        const textoATraducir = interaction.options.getString('texto');
        const idiomaDestino = interaction.options.getString('idioma');

        try {
            const resultado = await translate(textoATraducir, { to: idiomaDestino });

            // Importar franc dinámicamente
            const { franc } = await import('franc');

            // Usar franc para detectar el idioma de origen
            const idiomaOrigen = franc(textoATraducir);

            const banderaOrigen = banderas[idiomaOrigen] || '🏳️';
            const banderaDestino = banderas[idiomaDestino] || '🏳️';

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🌐 Traducción')
                .addFields(
                    { name: '📝 Texto original', value: `${banderaOrigen} ${textoATraducir}` },
                    { name: '🔄 Traducción', value: `${banderaDestino} ${resultado.text}` },
                    { name: '🌍 Idiomas', value: `De: ${banderaOrigen} ${idiomaOrigen} → A: ${banderaDestino} ${idiomaDestino}` }
                )
                .setFooter({ text: 'Traducción realizada con éxito' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al traducir:', error);
            await interaction.reply('Hubo un error al intentar traducir el texto. Por favor, inténtalo de nuevo.');
        }
    },
};