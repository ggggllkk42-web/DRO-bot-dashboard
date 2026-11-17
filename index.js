
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder
} = require("discord.js");

const { handleInteraction } = require("./handlers");
const { getGuild } = require("./database");

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  throw new Error("لم يتم ضبط DISCORD_TOKEN في إعدادات الاستضافة.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#9b65ff")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function log(guild, description) {
  try {
    const data = getGuild(guild.id);

    if (!data.logs.enabled || !data.logs.channelId) return;

    const channel = guild.channels.cache.get(data.logs.channelId);

    if (channel && channel.isTextBased()) {
      await channel.send({
        embeds: [makeEmbed("📋 سجل السيرفر", description)]
      });
    }
  } catch (error) {
    console.error("Log error:", error);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`DRO BOT is online: ${client.user.tag}`);
  client.user.setActivity("DRO BOT | الدعم الفني");
});

// الأوامر والأزرار
client.on(Events.InteractionCreate, async interaction => {
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error("DRO BOT interaction error:", error);

    if (interaction.isRepliable()) {
      const response = {
        content: "حدث خطأ أثناء تنفيذ الأمر. تأكد من صلاحيات البوت.",
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response).catch(() => {});
      } else {
        await interaction.reply(response).catch(() => {});
      }
    }
  }
});

// إنشاء وحذف الرومات
client.on(Events.ChannelCreate, channel => {
  if (channel.guild) {
    log(channel.guild, `تم إنشاء روم: ${channel.name}`);
  }
});

client.on(Events.ChannelDelete, channel => {
  if (channel.guild) {
    log(channel.guild, `تم حذف روم: ${channel.name}`);
  }
});


// منع تكرار لوق حذف الرسالة
const loggedDeletedMessages = new Set();

client.on(Events.MessageDelete, message => {
  if (!message.guild) return;
  if (loggedDeletedMessages.has(message.id)) return;

  loggedDeletedMessages.add(message.id);

  setTimeout(() => {
    loggedDeletedMessages.delete(message.id);
  }, 60000);

  const author = message.author?.tag || "عضو غير معروف";

  log(
    message.guild,
    `🗑️ تم حذف رسالة\nالعضو: ${author}\nالروم: <#${message.channelId}>`
  );
});


  log(
    message.guild,
    `🗑️ تم حذف رسالة\nالعضو: ${author}\nالروم: <#${message.channelId}>`
  );
});

// تعديل الرسائل
client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
  if (!newMessage.guild) return;

  const author = newMessage.author?.tag || "عضو غير معروف";

  log(
    newMessage.guild,
    `✏️ تم تعديل رسالة\nالعضو: ${author}\nالروم: <#${newMessage.channelId}>\n[عرض الرسالة](${newMessage.url})`
  );
});

// دخول وخروج الأعضاء
client.on(Events.GuildMemberAdd, member => {
  log(member.guild, `🟢 دخل العضو السيرفر: ${member.user.tag}`);
});

client.on(Events.GuildMemberRemove, member => {
  log(member.guild, `🔴 غادر العضو السيرفر: ${member.user.tag}`);
});

// الصوتيات
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const guild = newState.guild;
  const member = newState.member || oldState.member;

  if (!guild || !member) return;

  if (!oldState.channelId && newState.channelId) {
    log(guild, `${member.user.tag} دخل الصوتية ${newState.channel.name}`);
  } else if (oldState.channelId && !newState.channelId) {
    log(guild, `${member.user.tag} خرج من الصوتية ${oldState.channel.name}`);
  } else if (oldState.channelId !== newState.channelId) {
    log(
      guild,
      `${member.user.tag} انتقل من ${oldState.channel.name} إلى ${newState.channel.name}`
    );
  }
});

client.login(TOKEN);

require("./deploy-commands");
console.log("تم تشغيل ملف تسجيل الأوامر.");
