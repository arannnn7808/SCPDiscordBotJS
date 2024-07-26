const fs = require("fs");
const path = require("path");
const util = require("util");
const { DiscordAPIError } = require('discord.js');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  _log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (Object.keys(meta).length > 0) {
      const metaString = util
          .inspect(meta, { depth: null, colors: false })
          .replace(/\n/g, " ");
      logMessage += ` ${metaString}`;
    }

    const logFile = path.join(
        this.logDir,
        `${new Date().toISOString().split("T")[0]}.log`,
    );

    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + "\n");
  }

  formatError(error) {
    let errorName = error instanceof DiscordAPIError ? 'DiscordAPIError' : (error.name || 'Error');
    let errorCode = error instanceof DiscordAPIError ? error.code : (error.code || 'N/A');
    let errorMessage = error.message || 'Unknown error';

    let formattedError = `Error: ${errorName}[${errorCode}]: ${errorMessage}\n`;
    formattedError += `Location: ${this.getErrorLocation(error)}\n`;
    formattedError += 'Stack Trace:\n';

    const stackLines = (error.stack || '').split('\n');
    stackLines.forEach((line) => {
      formattedError += `  ${line.trim()}\n`;
    });

    if (error instanceof DiscordAPIError) {
      formattedError += `\nDiscord API Error Details:\n`;
      formattedError += `  Method: ${error.method || 'N/A'}\n`;
      formattedError += `  Path: ${error.url || 'N/A'}\n`;
      formattedError += `  Code: ${error.code}\n`;
      formattedError += `  HTTP Status: ${error.status || 'N/A'}\n`;
    }

    return formattedError;
  }

  getErrorLocation(error) {
    const stackLines = (error.stack || '').split('\n');
    for (const line of stackLines) {
      if (line.includes('SCPDiscordBotJS-SPANISH')) {
        const match = line.match(/\((.+?):(\d+):(\d+)\)/);
        if (match) {
          const [, filePath, lineNum, colNum] = match;
          return `${path.basename(filePath)}:${lineNum}:${colNum}`;
        }
      }
    }
    return 'Unknown location';
  }

  info(message, meta = {}) {
    this._log("INFO", message, meta);
  }

  warn(message, meta = {}) {
    this._log("WARN", message, meta);
  }

  error(message, error = {}, meta = {}) {
    const errorLocation = this.getErrorLocation(error);
    const errorMeta = {
      errorMessage: error.message || 'Unknown error',
      errorCode: error instanceof DiscordAPIError ? error.code : (error.code || 'N/A'),
      errorName: error instanceof DiscordAPIError ? 'DiscordAPIError' : (error.name || 'Error'),
      errorLocation: errorLocation,
      ...meta
    };

    if (error instanceof DiscordAPIError) {
      errorMeta.method = error.method;
      errorMeta.path = error.url;
      errorMeta.status = error.status;
    }

    this._log("ERROR", message, errorMeta);
    console.error(this.formatError(error));
  }

  debug(message, meta = {}) {
    if (process.env.DEBUG === "true") {
      this._log("DEBUG", message, meta);
    }
  }

  command(commandName, user, guild, meta = {}) {
    this._log(
        "INFO",
        `Command '${commandName}' executed by ${user.tag} in guild '${guild?.name || "DM"}'`,
        meta,
    );
  }

  interaction(type, user, guild, meta = {}) {
    this._log(
        "INFO",
        `${type} interaction by ${user.tag} in guild '${guild?.name || "DM"}'`,
        meta,
    );
  }
}

module.exports = new Logger();