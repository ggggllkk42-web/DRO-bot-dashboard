const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const {
  getGuild,
  loadDatabase,
  saveDatabase
} = require("./database");

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function saveGuild(guildId, callback) {
  getGuild(guildId);
  const database = loadDatabase();
  callback(database.guilds[guildId]);
  saveDatabase(database);
}

async function handleLogsInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return false;

  const command = interaction.commandName;

  const commands = [
  "logs",
  "logs-setup",
  "logs-channel",
  "logs-category",
  "logs-settings",
  "logs-edit",
  "logs-delete"
];

  if (!commands.includes(command)) return false;

  if (!interaction.guild) {
    await interaction.reply({
      content: "هذا الأمر يعمل داخل السيرفر فقط.",
      ephemeral: true
    });
    return true;
  }

  if (!isAdmin(interaction.member)) {
    await interaction.reply({
      content: "هذا الأمر للإدارة فقط.",
      ephemeral: true
    });
    return true;
  }

  try {
    const guildId = interaction.guild.id;

    if (command === "logs-delete") {
      saveGuild(guildId, data => {
        data.logs.enabled = false;
        data.logs.channelId = null;
        data.logs.categoryId = null;
      });

      await interaction.reply({
        content: "تم إيقاف نظام اللوقات.",
        ephemeral: true
      });
      return true;
    }

    if (command === "logs-category" || command === "logs-settings") {
  const category = interaction.options.getChannel("category");

  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: "حدد كاتقوري صحيحًا للسجلات.",
      ephemeral: true
    });
    return true;
  }

  saveGuild(guildId, data => {
    data.logs.categoryId = category.id;
  });

  await interaction.reply({
    content: `تم تحديد كاتقوري السجلات: ${category}.`,
    ephemeral: true
  });
  return true;
}
      const category = interaction.options.getChannel("category");

      saveGuild(guildId, data => {
        data.logs.categoryId = category.id;
      });

      await interaction.reply({
        content: `تم تحديد كاتقوري اللوقات: ${category}`,
        ephemeral: true
      });
      return true;
    }

    const channel = interaction.options.getChannel("channel");

    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "حدد رومًا كتابيًا صحيحًا للوقات.",
        ephemeral: true
      });
      return true;
    }

    saveGuild(guildId, data => {
      data.logs.channelId = channel.id;
      data.logs.enabled = true;
    });

    await interaction.reply({
      content: `تم تفعيل اللوقات في ${channel}.`,
      ephemeral: true
    });

    return true;

  } catch (error) {
    console.error("Logs handler error:", error);

    const response = {
      content: "حدث خطأ أثناء إعداد اللوقات.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }

    return true;
  }
}

async function sendLog(guild, title, description) {
  try {
    const data = getGuild(guild.id);

    if (!data.logs.enabled || !data.logs.channelId) return;

    const channel = guild.channels.cache.get(data.logs.channelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor("#9b65ff")
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

  } catch (error) {
    console.error("Send log error:", error);
  }
}

module.exports = {
  handleLogsInteraction,
  sendLog
};
