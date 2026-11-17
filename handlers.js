
const {
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const {
  handleTicketInteraction
} = require("./ticket-handler");

const {
  handleLogsInteraction
} = require("./logs-handler");

const {
  handleApplicationInteraction
} = require("./application-handler");

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

async function handleInteraction(interaction) {
  try {
    const applicationHandled =
      await handleApplicationInteraction(interaction);

    if (applicationHandled) return true;

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("dro_ticket_")
    ) {
      return await handleTicketInteraction(interaction);
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName.startsWith("ticket")
    ) {
      return await handleTicketInteraction(interaction);
    }

    if (!interaction.isChatInputCommand()) return false;

    const logsHandled =
      await handleLogsInteraction(interaction);

    if (logsHandled) return true;

    if (!interaction.guild) {
      await interaction.reply({
        content: "هذا الأمر يعمل داخل السيرفر فقط.",
        ephemeral: true
      });
      return true;
    }

    const command = interaction.commandName;
    const guild = interaction.guild;
    const member = interaction.member;

    if (command === "help") {
      const panel = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle("DRO BOT | قائمة الأوامر")
        .setDescription(
          "`/kick` طرد عضو\n" +
          "`/ban` حظر عضو\n" +
          "`/unban` فك الحظر\n" +
          "`/timeout` إسكات عضو\n" +
          "`/clear` مسح الرسائل\n" +
          "`/lock` قفل الروم\n" +
          "`/unlock` فتح الروم\n" +
          "`/apply-setup` إعداد التقديم\n" +
          "`/apply-panel` نشر لوحة التقديم\n" +
          "`/laws-setup` إعداد القوانين\n" +
          "`/laws-edit` تعديل قانون\n" +
          "`/laws-publish` نشر القوانين"
        );

      await interaction.reply({
        embeds: [panel],
        ephemeral: true
      });
      return true;
    }

    if (command === "kick") {
      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        await interaction.reply({
          content: "ما عندك صلاحية الطرد.",
          ephemeral: true
        });
        return true;
      }

      const user = interaction.options.getUser("member");
      const reason = interaction.options.getString("reason") || "بدون سبب";
      const target = await guild.members.fetch(user.id);

      await target.kick(reason);
      await interaction.reply(`تم طرد ${user.tag}.`);
      return true;
    }

    if (command === "ban") {
      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await interaction.reply({
          content: "ما عندك صلاحية الحظر.",
          ephemeral: true
        });
        return true;
      }

      const user = interaction.options.getUser("member");
      const reason = interaction.options.getString("reason") || "بدون سبب";

      await guild.members.ban(user.id, { reason });
      await interaction.reply(`تم حظر ${user.tag}.`);
      return true;
    }

    if (command === "unban") {
      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await interaction.reply({
          content: "ما عندك صلاحية فك الحظر.",
          ephemeral: true
        });
        return true;
      }

      const id = interaction.options.getString("userid");
      await guild.members.unban(id);
      await interaction.reply("تم فك الحظر.");
      return true;
    }

    if (command === "timeout") {
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        await interaction.reply({
          content: "ما عندك صلاحية الإسكات.",
          ephemeral: true
        });
        return true;
      }

      const user = interaction.options.getUser("member");
      const minutes = interaction.options.getInteger("minutes");
      const reason = interaction.options.getString("reason") || "بدون سبب";
      const target = await guild.members.fetch(user.id);

      await target.timeout(minutes * 60000, reason);
      await interaction.reply(
        `تم إسكات ${user.tag} لمدة ${minutes} دقيقة.`
      );
      return true;
    }

    if (command === "clear") {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        await interaction.reply({
          content: "ما عندك صلاحية مسح الرسائل.",
          ephemeral: true
        });
        return true;
      }

      const amount = interaction.options.getInteger("amount");
      const deleted = await interaction.channel.bulkDelete(amount, true);

      await interaction.reply({
        content: `تم حذف ${deleted.size} رسالة.`,
        ephemeral: true
      });
      return true;
    }

    if (command === "lock" || command === "unlock") {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await interaction.reply({
          content: "ما عندك صلاحية إدارة الرومات.",
          ephemeral: true
        });
        return true;
      }

      await interaction.channel.permissionOverwrites.edit(
        guild.roles.everyone,
        {
          SendMessages: command === "lock" ? false : null
        }
      );

      await interaction.reply(
        command === "lock" ? "🔒 تم قفل الروم." : "🔓 تم فتح الروم."
      );
      return true;
    }

    if (
      command === "laws-setup" ||
      command === "laws-edit" ||
      command === "laws-publish" ||
      command === "law-add" ||
      command === "law-edit" ||
      command === "law-delete" ||
      command === "laws" ||
      command === "law-publish"
    ) {
      if (!isAdmin(member)) {
        await interaction.reply({
          content: "هذا الأمر للإدارة فقط.",
          ephemeral: true
        });
        return true;
      }

      if (command === "laws-setup") {
        const title = interaction.options.getString("title");
        const channel = interaction.options.getChannel("channel");

        saveGuild(guild.id, data => {
          data.laws.title = title;
          data.laws.channelId = channel.id;
        });

        await interaction.reply({
          content: "تم حفظ إعدادات القوانين.",
          ephemeral: true
        });
        return true;
      }

      if (command === "law-add") {
        const law = interaction.options.getString("law");

        saveGuild(guild.id, data => {
          if (!data.laws.items) data.laws.items = [];
          data.laws.items.push(law);
        });

        await interaction.reply("تمت إضافة القانون بنجاح.");
        return true;
      }

      if (command === "laws-edit" || command === "law-edit") {
        const number = interaction.options.getInteger("number");
        const law = interaction.options.getString("law");
        let updated = false;

        saveGuild(guild.id, data => {
          if (data.laws.items[number - 1] !== undefined) {
            data.laws.items[number - 1] = law;
            updated = true;
          }
        });

        await interaction.reply(
          updated ? "تم تعديل القانون." : "رقم القانون غير موجود."
        );
        return true;
      }

      if (command === "law-delete") {
        const number = interaction.options.getInteger("number");
        let deleted = false;

        saveGuild(guild.id, data => {
          if (data.laws.items[number - 1] !== undefined) {
            data.laws.items.splice(number - 1, 1);
            deleted = true;
          }
        });

        await interaction.reply(
          deleted ? "تم حذف القانون." : "رقم القانون غير موجود."
        );
        return true;
      }

      const data = getGuild(guild.id);
      const list = data.laws.items || [];

      if (!list.length) {
        await interaction.reply({
          content: "ما أضفت قوانين حتى الآن.",
          ephemeral: true
        });
        return true;
      }

      const channel =
        interaction.options.getChannel("channel") ||
        (data.laws.channelId
          ? guild.channels.cache.get(data.laws.channelId)
          : interaction.channel);

      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: "حدد رومًا كتابيًا صحيحًا للقوانين.",
          ephemeral: true
        });
        return true;
      }

      const panel = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle(data.laws.title || "📜 قوانين السيرفر")
        .setDescription(
          list.map((law, index) => `${index + 1}. ${law}`).join("\n")
        );

      await channel.send({ embeds: [panel] });

      await interaction.reply({
        content: "تم نشر القوانين.",
        ephemeral: true
      });
      return true;
    }

    await interaction.reply({
      content: "هذا الأمر لم تتم برمجته بعد.",
      ephemeral: true
    });

    return true;

  } catch (error) {
    console.error("DRO BOT error:", error);

    const response = {
      content: "حدث خطأ أثناء تنفيذ الأمر. تأكد من صلاحيات البوت ورتبه.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }

    return true;
  }
}

module.exports = { handleInteraction };
