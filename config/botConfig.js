module.exports = {
  serverStatus: {
    apiBaseUrl: "https://api.scplist.kr/api/servers/",
    embedColor: {
      online: "#00FF00",
      offline: "#FF0000",
    },
    cacheDuration: 60000, // 1 minute
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    requiredFields: [
      "online",
      "players",
      "maxPlayers",
      "version",
      "friendlyFire",
      "ip",
      "port",
      "serverTech",
      "name",
    ],
  },
  embeds: {
    footerText: "Desarrollado por arannnn78 & _veins",
  },
  errorMessages: {
    generic: "Ocurrió un error. Por favor, inténtalo de nuevo más tarde.",
    permissionDenied: "No tienes permiso para usar este comando.",
    cooldownActive: "Por favor, espera antes de usar este comando nuevamente.",
  },
  serverStatusTexts: {
    title: "Estado del Servidor",
    online: "🟢 Activo",
    offline: "🔴 Inactivo",
    players: "Jugadores",
    version: "Versión",
    friendlyFire: "Fuego Amigo",
    friendlyFireEnabled: "✅ Activado",
    friendlyFireDisabled: "❌ Desactivado",
  },
};
