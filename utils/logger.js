const fs = require("fs");
const path = require("path");
const util = require("util");

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

  info(message, meta = {}) {
    this._log("INFO", message, meta);
  }

  warn(message, meta = {}) {
    this._log("WARN", message, meta);
  }

  error(message, error, meta = {}) {
    const errorMeta = {
      ...meta,
      errorMessage: error.message,
      stack: error.stack,
    };
    this._log("ERROR", message, errorMeta);
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
