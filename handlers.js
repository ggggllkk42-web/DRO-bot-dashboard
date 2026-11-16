
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const { getGuild, saveDatabase, loadDatabase } = require("./database");

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return false;

  if (!interaction.guild) {
    await interaction.reply({
      content: "هذا الأمر يعمل داخل السيرفر فقط.",
      ephemeral: true
    });
    return true;
  }

  const command = interaction.commandName;
  const member = interaction.member;
  const guild = interaction.guild;

  try {
    if (command === "help") {
      const embed = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle("DRO BOT | قائمة الأوامر")
        .setDescription(
          "`/help` المساعدة\n" +
          "`/kick` طرد عضو\n" +
          "`/ban` حظر عضو\n" +
          "`/unban` فك الحظر\n" +
          "`/timeout` إسكات عضو\n" +
          "`/clear` مسح الرسائل\n" +
          "`/lock` قفل الروم\n" +
          "`/unlock` فتح الروم\n" +
          "`/ticket` نشر لوحة التذاكر\n" +
          "`/logs` إعداد اللوقات\n" +
          "`/laws` نشر القوانين\n" +
          "`/apply` التقديم"
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return true;
    }

    if (command === "kick") {
      const target = await guild.members.fetch(
        interaction.options.getUser("member").id
      );
      const reason = interaction.options.getString("reason") || "بدون سبب";

      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        await interaction.reply({ content: "ما عندك صلاحية الطرد.", ephemeral: true });
        return true;
      }

      await target.kick(reason);
      await interaction.reply(`تم طرد ${target.user.tag}.`);
      return true;
    }

    if (command === "ban") {
      const user = interaction.options.getUser("member");
      const reason = interaction.options.getString("reason") || "بدون سبب";

      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await interaction.reply({ content: "ما عندك صلاحية الحظر.", ephemeral: true });
        return true;
      }

      await guild.members.ban(user.id, { reason });
      await interaction.reply(`تم حظر ${user.tag}.`);
      return true;
    }

    if (command === "unban") {
      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await interaction.reply({ content: "ما عندك صلاحية فك الحظر.", ephemeral: true });
        return true;
      }

      const id = interaction.options.getString("userid");
      await guild.members.unban(id);
      await interaction.reply("تم فك الحظر.");
      return true;
    }

    if (command === "timeout") {
      const user = interaction.options.getUser("member");
      const minutes = interaction.options.getInteger("minutes");

      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        await interaction.reply({ content: "ما عندك صلاحية الإسكات.", ephemeral: true });
        return true;
      }

      const target = await guild.members.fetch(user.id);
      await target.timeout(minutes * 60 * 1000);
      await interaction.reply(`تم إسكات ${user.tag} لمدة ${minutes} دقيقة.`);
      return true;
    }

    if (command === "clear") {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        await interaction.reply({ content: "ما عندك صلاحية مسح الرسائل.", ephemeral: true });
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
        await interaction.reply({ content: "ما عندك صلاحية إدارة الرومات.", ephemeral: true });
        return true;
      }

      await interaction.channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: command === "lock" ? false : null }
      );

      await interaction.reply(
        command === "lock" ? "🔒 تم قفل الروم." : "🔓 تم فتح الروم."
      );
      return true;
    }

    if (command === "logs") {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: "هذا الأمر للإدارة فقط.", ephemeral: true });
        return true;
      }

      const channel = interaction.options.getChannel("channel");
      const database = loadDatabase();

      if (!database.guilds[guild.id]) getGuild(guild.id);

      const data = loadDatabase();
      data.guilds[guild.id].logs.channelId = channel.id;
      data.guilds[guild.id].logs.enabled = true;
      saveDatabase(data);

      await interaction.reply(`تم تحديد ${channel} رومًا للوقات.`);
      return true;
    }

    if (command === "ticket") {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: "هذا الأمر للإدارة فقط.", ephemeral: true });
        return true;
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dro_ticket_open")
          .setLabel("فتح تذكرة")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

      const panel = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle("🎫 الدعم الفني")
        .setDescription("اضغط الزر بالأسفل لفتح تذكرة مع فريق الدعم.");

      await interaction.channel.send({
        embeds: [panel],
        components: [row]
      });

      await interaction.reply({
        content: "تم نشر لوحة التذاكر.",
        ephemeral: true
      });
      return true;
    }

    if (command === "laws") {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: "هذا الأمر للإدارة فقط.", ephemeral: true });
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

      const panel = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle(data.laws.title || "📜 قوانين السيرفر")
        .setDescription(list.map((law, index) => `${index + 1}. ${law}`).join("\n"));

      const channel = data.laws.channelId
        ? guild.channels.cache.get(data.laws.channelId)
        : interaction.channel;

      if (!channel) {
        await interaction.reply({
          content: "روم القوانين غير موجود. حدد رومًا صحيحًا.",
          ephemeral: true
        });
        return true;
      }

      await channel.send({ embeds: [panel] });
      await interaction.reply({ content: "تم نشر القوانين.", ephemeral: true });
      return true;
    }

    if (command === "apply") {
      await interaction.reply({
        content: "نظام التقديم يحتاج إعداد أسئلة وروم استقبال الطلبات أولاً.",
        ephemeral: true
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("DRO BOT command error:", error);

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
