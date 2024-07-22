const fs = require('fs');
const path = require('path');

// Use path.resolve to ensure we're using the project root
const projectRoot = path.resolve(__dirname, '..');
const logDir = path.join(projectRoot, 'logs');

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

function getTimestamp() {
    return new Date().toISOString();
}

function formatMessage(level, message, meta = {}) {
    const timestamp = getTimestamp();
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}\n`;
}

function logToFile(level, message, meta = {}) {
    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logMessage = formatMessage(level, message, meta);
    fs.appendFileSync(logFile, logMessage);
}

function log(level, message, meta = {}) {
    console[level](formatMessage(level, message, meta));
    logToFile(level, message, meta);
}

function info(message, meta = {}) {
    log('info', message, meta);
}

function warn(message, meta = {}) {
    log('warn', message, meta);
}

function error(message, error, meta = {}) {
    const errorMeta = { ...meta, errorMessage: error.message, stack: error.stack };
    log('error', message, errorMeta);
}

function debug(message, meta = {}) {
    if (process.env.DEBUG === 'true') {
        log('debug', message, meta);
    }
}

module.exports = {
    info,
    warn,
    error,
    debug
};