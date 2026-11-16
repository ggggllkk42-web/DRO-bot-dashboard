
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID");
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deploy() {
  try {
    console.log("جاري تسجيل أوامر DRO BOT...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("تم تسجيل أوامر DRO BOT بنجاح!");
  } catch (error) {
    console.error("حدث خطأ أثناء تسجيل الأوامر:", error);
    process.exitCode = 1;
  }
}

deploy();
