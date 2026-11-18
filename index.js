
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  PermissionsBitField,
  ActivityType
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

const spamTracker = new Map();
const loggedMessages = new Set();

function makeEmbed(title, description, color = 0x5865F2) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description || "لا توجد تفاصيل")
    .setTimestamp();
}

async function log(guild, title, description) {
  try {
    const settings = getGuild(guild.id);
    const logs = settings.logs;

    if (!logs || !logs.enabled || !logs.channelId) return;

    const channel = await guild.channels.fetch(logs.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    await channel.send({
      embeds: [makeEmbed(title, description)]
    }).catch(() => {});
  } catch (error) {
    console.error("خطأ في نظام السجلات:", error);
  }
}

client.once(Events.ClientReady, (bot) => {
  console.log(`DRO BOT يعمل الآن باسم ${bot.user.tag}`);

  bot.user.setPresence({
    activities: [{
      name: "DRO BOT",
      type: ActivityType.Watching
    }],
    status: "online"
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error("خطأ في تنفيذ الأمر:", error);

    const reply = {
      content: "حدث خطأ أثناء تنفيذ الأمر.",
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.on(Events.ChannelCreate, async (channel) => {
  if (channel.guild) {
    await log(channel.guild, "إنشاء روم", `تم إنشاء الروم: ${channel.name}`);
  }
});

client.on(Events.ChannelDelete, async (channel) => {
  if (channel.guild) {
    await log(channel.guild, "حذف روم", `تم حذف الروم: ${channel.name}`);
  }
});

client.on(Events.MessageDelete, async (message) => {
  try {
    if (message.partial) {
      message = await message.fetch().catch(() => null);
    }

    if (!message || !message.guild || message.author?.bot) return;

    const key = message.id;
    if (loggedMessages.has(key)) return;

    loggedMessages.add(key);
    setTimeout(() => loggedMessages.delete(key), 60000);

    await log(
      message.guild,
      "حذف رسالة",
      `العضو: ${message.author?.tag || "غير معروف"}\nالروم: ${message.channel}\nالمحتوى: ${(message.content || "غير متوفر").slice(0, 1000)}`
    );
  } catch (error) {
    console.error("خطأ في سجل حذف الرسائل:", error);
  }
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  try {
    if (oldMessage.partial) {
      oldMessage = await oldMessage.fetch().catch(() => null);
    }

    if (newMessage.partial) {
      newMessage = await newMessage.fetch().catch(() => null);
    }

    if (!oldMessage || !newMessage || !newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await log(
      newMessage.guild,
      "تعديل رسالة",
      `العضو: ${newMessage.author?.tag || "غير معروف"}\nالروم: ${newMessage.channel}\nقبل: ${(oldMessage.content || "فارغ").slice(0, 500)}\nبعد: ${(newMessage.content || "فارغ").slice(0, 500)}`
    );
  } catch (error) {
    console.error("خطأ في سجل تعديل الرسائل:", error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await log(member.guild, "دخول عضو", `العضو: ${member.user.tag}`);

    const settings = getGuild(member.guild.id);
    const welcome = settings.welcome;

    if (!welcome || !welcome.channelId) return;

    const channel = await member.guild.channels.fetch(welcome.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const message = (welcome.message || "حياك الله {user} في {server}")
      .replaceAll("{user}", `${member}`)
      .replaceAll("{server}", member.guild.name)
      .replaceAll("{username}", member.user.username);

    await channel.send(message).catch(() => {});
  } catch (error) {
    console.error("خطأ في الترحيب:", error);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  await log(member.guild, "خروج عضو", `العضو: ${member.user?.tag || member.id}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot || !message.member) return;

    const settings = getGuild(message.guild.id);
    const protection = settings.protection || {};

    const permissions = message.member.permissions;

    if (
      permissions.has(PermissionsBitField.Flags.Administrator) ||
      permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) return;

    if (protection.antilinks) {
      const linkPattern = /(https?:\/\/|www\.|discord\.gg\/)/i;

      if (linkPattern.test(message.content)) {
        await message.delete().catch(() => {});
        const warning = await message.channel.send(
          `${message.author} يمنع إرسال الروابط هنا.`
        ).catch(() => null);

        if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
        return;
      }
    }

    if (protection.antimentions) {
      const mentions =
        message.mentions.users.size +
        message.mentions.roles.size;

      if (mentions >= 5) {
        await message.delete().catch(() => {});
        const warning = await message.channel.send(
          `${message.author} يمنع الإزعاج بالمنشن.`
        ).catch(() => null);

        if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
        return;
      }
    }

    if (protection.antispam) {
      const key = `${message.guild.id}-${message.author.id}`;
      const now = Date.now();

      const data = spamTracker.get(key) || [];
      const recent = data.filter(time => now - time < 5000);

      recent.push(now);
      spamTracker.set(key, recent);

      if (recent.length >= 6) {
        spamTracker.delete(key);

        await message.delete().catch(() => {});
        const warning = await message.channel.send(
          `${message.author} تم منع التكرار المزعج للرسائل.`
        ).catch(() => null);

        if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
      }
    }
  } catch (error) {
    console.error("خطأ في نظام الحماية:", error);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    const member = newState.member || oldState.member;
    if (!member) return;

    if (!oldState.channel && newState.channel) {
      await log(member.guild, "دخول روم صوتي", `${member.user.tag} دخل ${newState.channel.name}`);
    } else if (oldState.channel && !newState.channel) {
      await log(member.guild, "خروج من روم صوتي", `${member.user.tag} خرج من ${oldState.channel.name}`);
    } else if (oldState.channelId !== newState.channelId) {
      await log(
        member.guild,
        "تغيير روم صوتي",
        `${member.user.tag}\nمن: ${oldState.channel?.name || "غير معروف"}\nإلى: ${newState.channel?.name || "غير معروف"}`
      );
    }
  } catch (error) {
    console.error("خطأ في سجل الصوتيات:", error);
  }
});

client.login(TOKEN).catch((error) => {
  console.error("تعذر تشغيل البوت:", error);
});
