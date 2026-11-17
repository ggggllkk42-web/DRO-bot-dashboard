const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  PermissionsBitField
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
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
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

// تشغيل البوت
client.once(Events.ClientReady, () => {
  console.log(`DRO BOT is online: ${client.user.tag}`);
  client.user.setActivity("DRO BOT | الدعم الفني");
});

// استقبال الأوامر
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

// حذف الرسائل
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

// تعديل الرسائل
client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
  if (!newMessage.guild) return;

  const author = newMessage.author?.tag || "عضو غير معروف";

  log(
    newMessage.guild,
    `✏️ تم تعديل رسالة\nالعضو: ${author}\nالروم: <#${newMessage.channelId}>\n[عرض الرسالة](${newMessage.url})`
  );
});

// الترحيب وتسجيل دخول الأعضاء
client.on(Events.GuildMemberAdd, async member => {
  log(member.guild, `🟢 دخل العضو السيرفر: ${member.user.tag}`);

  try {
    const data = getGuild(member.guild.id);
    const welcome = data.welcome;

    if (!welcome.enabled || !welcome.channelId) return;

    const channel = await member.guild.channels
      .fetch(welcome.channelId)
      .catch(() => null);

    if (!channel || !channel.isTextBased()) return;

    const message = (welcome.message || "أهلاً بك {user} في سيرفر {server}!")
      .replace(/\{user\}/g, `<@${member.id}>`)
      .replace(/\{server\}/g, member.guild.name)
      .replace(/\{username\}/g, member.user.username);

    await channel.send({ content: message });
  } catch (error) {
    console.error("Welcome error:", error);
  }
});

// خروج الأعضاء
client.on(Events.GuildMemberRemove, member => {
  log(member.guild, `🔴 غادر العضو السيرفر: ${member.user.tag}`);
});

// حماية الرسائل
const spamTracker = new Map();

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;

  try {
    const data = getGuild(message.guild.id);
    const protection = data.protection || {};

    if (
      !protection.antiSpam &&
      !protection.antiLinks &&
      !protection.antiMentions
    ) return;

    const member = message.member;

    if (!member) return;

    const isExempt = member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) || member.permissions.has(
      PermissionsBitField.Flags.ManageMessages
    );

    if (isExempt) return;

    let violation = null;

    // منع الروابط
    if (protection.antiLinks) {
      const linkPattern = /(https?:\/\/|www\.|discord\.gg\/)/i;

      if (linkPattern.test(message.content)) {
        violation = "الروابط ممنوعة في هذا السيرفر.";
      }
    }

    // منع المنشن الجماعي
    if (
      !violation &&
      protection.antiMentions &&
      message.mentions.users.size + message.mentions.roles.size >= 5
    ) {
      violation = "ممنوع الإكثار من المنشن.";
    }

    // منع السبام
    if (!violation && protection.antiSpam) {
      const key = `${message.guild.id}_${message.author.id}`;
      const now = Date.now();

      const previous = spamTracker.get(key) || [];
      const recent = previous.filter(time => now - time < 5000);

      recent.push(now);
      spamTracker.set(key, recent);

      if (recent.length >= 6) {
        violation = "تم حذف الرسالة بسبب إرسال رسائل كثيرة بسرعة.";
        spamTracker.delete(key);
      }
    }

    if (violation) {
      await message.delete().catch(() => {});

      const warning = await message.channel.send({
        content: `⚠️ ${message.author} ${violation}`
      }).catch(() => null);

      if (warning) {
        setTimeout(() => {
          warning.delete().catch(() => {});
        }, 5000);
      }
    }
  } catch (error) {
    console.error("Protection error:", error);
  }
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
