# SCPDiscordBot - Spanish Tutorial

Un bot para tu servidor de scpsl, tiene los comandos basicos para banear, expulsar, etc... Tiene el comando /servidor, que es para ver la informacion del servidor de SCPSL. Este bot utiliza javascript y tiene el archivo .env, que se usa como config para las opciones que tiene.

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

## Este bot utiliza la api de https://scplist.kr (como saber cual es mi server id)

1. Dirigete a la pagina de https://scplist.kr.
2. Busca tu servidor en el apartado de servidores.
3. Cuando lo hayas encontrado haz click sobre él, y veras el estado y un grafico.
4. En el link de la pagina web verás algo como esto "https://scplist.kr/servers/11111".
5. Despues del /server los numeros que hay ahí es tu id del servidor.
6. Ahora con la id ponla en el archivo ``.env`` en el apartado ``SERVER_ID_API``.

## Crear el Bot en el Developer Portal de Discord.

1. Entra en el developer portal y inicia sesion en discord: https://discord.com/developers/applications.
2. Crea una aplicación nueva y ponle el nombre que desees.
3. Ahora puedes ponerle el logo que desees para que muestre en el bot.
4. Dirigete a ``Bot`` y agarra el ``TOKEN`` para ponerlo en el archivo ``.env`` que crearás a continuación.
5. Dirigete a ``OAuth2`` y copia tambien el ``Client ID`` del bot que tambien pondrás en el archivo ``.env``.
6. Después en ``Installation`` selecciona unicamente la opción ``Guild Install`` y en los permisos de abajo deberás tener en Scopes ``applications.commands`` y ``bot``, y en Permissions usa ``Administrator``.
7. Agarra el link que te dan en ``Install Link`` con la opción ``Discord Provided Link`` y pegalo el tu navegador para agregar el bot a tu servidor.

## Config archivo .env que debereis crear en la carpeta principal del bot
```env
BOT_TOKEN=token del bot aqui

PRESENCE_TEXT=el texto que quieres que muestre el estado del bot

CLIENT_ID=el client id del bot aqui

STAFF_ROLE_ID=id del rol de staff

MEGA_STAFF_ROLE=id del rol de staff para comandos de administración importantes

SERVER_NAME_SCPSL=El nombre de tu servidor aqui de SCPSL

SERVER_ID_API=el server api id de la pagina de scplist.kr, la documentacion esta en el apartado de: como saber cual es mi server id

LINK_IMAGE_SERVER=link del logo de tu servidor que acabe con el final .png, .jpg
```
