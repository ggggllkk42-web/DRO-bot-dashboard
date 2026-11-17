const { REST, Routes } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("يرجى ضبط DISCORD_TOKEN و CLIENT_ID و GUILD_ID");
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deleteCommands() {
  try {
    console.log("جاري حذف جميع أوامر DRO BOT...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );

    console.log("تم حذف جميع أوامر السيرفر بنجاح!");
  } catch (error) {
    console.error("خطأ أثناء حذف الأوامر:", error);
  }
}

deleteCommands();
