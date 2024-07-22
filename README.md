# SCPDiscordBot - Tutorial en Español

## ESTA ES UNA VERSION DE DESARROLLO, NO SE ASEGURA QUE SEA ESTABLE.

Un bot de Discord para tu servidor de SCP:SL, con comandos básicos para banear, expulsar, y más. Incluye el comando /servidor para ver la información del servidor de SCP:SL. Este bot utiliza JavaScript y un archivo .env para la configuración.

## Requisitos Previos

- Node.js (versión 16.x o superior)
- npm (normalmente se instala con Node.js)
- Un token de bot de Discord
- ID de cliente de Discord
- ID de servidor de SCP:SL (de scplist.kr)

## Instalación

1. Clona este repositorio o descarga el código fuente.
2. Navega al directorio del proyecto en tu terminal.
3. Ejecuta el siguiente comando para instalar las dependencias:

```bash
npm install
```

4. Crea un archivo `.env` en el directorio raíz del proyecto con el siguiente contenido:

```env
BOT_TOKEN=tu_token_de_bot_aquí
PRESENCE_TEXT=texto_de_estado_del_bot
CLIENT_ID=id_de_cliente_de_tu_bot
SERVER_NAME_SCPSL=Nombre_de_tu_servidor_SCPSL
SERVER_ID_API=id_de_api_de_scplist.kr
LINK_IMAGE_SERVER=URL_de_la_imagen_de_tu_servidor
```

Reemplaza los valores con tu información específica.

## Uso

Para iniciar el bot, ejecuta:

```bash
node bot.js
```

Para actualizar los comandos slash (/), ejecuta:

```bash
node deploy-commands.js
```

## Comandos Disponibles

- `/ban`: Banea a un usuario del servidor.
- `/kick`: Expulsa a un usuario del servidor.
- `/say`: Hace que el bot repita un mensaje.
- `/servidor`: Muestra información sobre el servidor de SCP:SL.
- `/traducir`: Traduce texto a otro idioma.
- `/userinfo`: Muestra información sobre un usuario.
- `/ayuda`: Muestra una lista de todos los comandos disponibles.

## Permisos

Asegúrate de que el bot tenga los siguientes permisos en tu servidor de Discord:

- Leer mensajes
- Enviar mensajes
- Banear miembros
- Expulsar miembros
- Gestionar mensajes

## Configuración del Servidor SCP:SL

Para obtener el ID de API de tu servidor SCP:SL:

1. Ve a https://scplist.kr
2. Busca tu servidor en la lista.
3. Haz clic en tu servidor y observa la URL.
4. El número después de `/servers/` en la URL es tu ID de API.

## Solución de Problemas

Si encuentras algún problema:

1. Asegúrate de que todas las dependencias estén instaladas correctamente.
2. Verifica que el archivo .env esté configurado correctamente.
3. Comprueba que el bot tenga los permisos necesarios en tu servidor de Discord.
4. Revisa la consola para ver mensajes de error específicos.

## Licencia

Este proyecto está licenciado bajo la Licencia GPL-3.0. Consulta el archivo `LICENSE` para más detalles.