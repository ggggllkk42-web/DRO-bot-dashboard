
const { REST, Routes } = require("discord.js");
const commands = require("./commands");
console.log("عدد الأوامر:", commands.length);
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("يرجى ضبط DISCORD_TOKEN و CLIENT_ID و GUILD_ID");
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deployCommands() {
  try {
    console.log("جاري تسجيل أوامر DRO BOT...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(command => command.toJSON()) }
    );

    console.log("تم تسجيل أوامر DRO BOT بنجاح!");
  } catch (error) {
    console.error("حدث خطأ أثناء تسجيل الأوامر:", error);
  }
}

deployCommands();
