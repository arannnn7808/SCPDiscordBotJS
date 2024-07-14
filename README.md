# SCPDiscordBot - Spanish Tutorial

Un bot para tu servidor de scpsl, tiene los comandos basicos para banear, expulsar, etc... Tiene el comando /servidor, que es para ver la informacion del servidor de SCPSL. Este bot utiliza javascript y tiene el archivo .env, que se usa como config para las opciones que tiene.

## Este bot utiliza la api de https://scplist.kr

## Descargar NODE.JS y NPM para linux.

```bash
# Instalar NVM para descargar el paquete
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Para hacer el siguiente comando tienes que reiniciar la maquina.
# Haz el nvm install para instalar node js y npm
nvm install 20
# Aqui verificas que esta instalado NodeJS
node -v # deberia darte `v20.15.1` si es una versión superior mejor
# Aqui verificas que esta instalado NPM
npm -v # deberia darte `10.7.0` si es una versión superior mejor
```

## Descargar NODE.JS y NPM para Windows.

Enlace de descarga: https://nodejs.org/en/

## Instalación

Descarga el archivo ZIP de la ultima release, y lo extraes en tu ordenador, tu VPS, etc...

```bash
# Usa este comando para descargar todas las dependencias en la carpeta node_modules/
npm install

# Para iniciar el bot usa el comando
node ./bot.js
# Deberia de responderte: Bot conectado como "nombre del bot y #"

# Tambien esta el comando para recargar los slash (/) commands.
node ./deploy-commands.js
# Deberia responderte como: Se estan refrescando los comandos (/). || Se han refrescado los comandos (/).
```

## Crear el Bot en el Developer Portal de Discord.

1. Entra en el developer portal y inicia sesion en discord: https://discord.com/developers/applications
2. Crea una aplicación nueva y ponle el nombre que desees
3. Ahora puedes ponerle el logo que desees para que muestre en el bot.
4. Y por ultimo dirigete a ``Bot`` y agarra el ``TOKEN`` para ponerlo en el archivo ``.env`` que crearás a continuación.

## Config archivo .env que debereis crear en la carpeta principal del bot
```env
BOT_TOKEN=token-del-bot

CLIENT_ID=client-id-bot

STAFF_ROLE_ID=id-rol-staff

MEGA_STAFF_ROLE=id-rol-staff-para-comandos-administración

SERVER_NAME_SCPSL=El nombre de tu servidor aqui

SERVER_ID_API=el-server-id-de-la-api-de-scplist

LINK_IMAGE_SERVER=link-logo-de-tu-server
```
