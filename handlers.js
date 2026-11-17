const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
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

function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

function saveGuild(guildId, callback) {
  getGuild(guildId);

  const database = loadDatabase();

  callback(database.guilds[guildId]);

  saveDatabase(database);
}

async function deny(interaction, message) {
  await interaction.reply({
    content: message,
    ephemeral: true
  });
}

function canManageTarget(interaction, target) {
  if (target.id === interaction.guild.ownerId) return false;
  if (target.id === interaction.user.id) return false;

  if (interaction.user.id === interaction.guild.ownerId) {
    return true;
  }

  return interaction.member.roles.highest.comparePositionTo(
    target.roles.highest
  ) > 0;
}

function canManageRole(interaction, role) {
  if (role.id === interaction.guild.id) return false;

  if (interaction.user.id === interaction.guild.ownerId) {
    return true;
  }

  return interaction.member.roles.highest.comparePositionTo(role) > 0;
}

async function handleInteraction(interaction) {
  try {
    // نظام التقديم
    const applicationHandled =
      await handleApplicationInteraction(interaction);

    if (applicationHandled) return true;

    // نظام التذاكر
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

    // نظام السجلات
    const logsHandled =
      await handleLogsInteraction(interaction);

    if (logsHandled) return true;

    if (!interaction.guild) {
      await deny(interaction, "هذا الأمر يعمل داخل السيرفر فقط.");
      return true;
    }

    const command = interaction.commandName;
    const guild = interaction.guild;
    const member = interaction.member;

    // =========================
    // المساعدة
    // =========================

    if (command === "help") {
      const embed = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle("DRO BOT | قائمة الأوامر")
        .setDescription(
          "**الإدارة**\n" +
          "`/kick` `/ban` `/unban` `/timeout` `/untimeout`\n" +
          "`/warn` `/warnings` `/clear-warnings` `/clear`\n" +
          "`/lock` `/unlock` `/hide` `/unhide`\n" +
          "`/role-add` `/role-remove` `/nickname`\n" +
          "`/move` `/disconnect` `/userinfo` `/serverinfo`\n\n" +
          "**التذاكر**\n" +
          "`/ticket-setup` `/ticket-panel` `/ticket-settings`\n" +
          "`/ticket-claim` `/ticket-close` `/ticket-delete`\n\n" +
          "**التقديم**\n" +
          "`/apply-setup` `/apply-panel` `/apply-settings`\n\n" +
          "**الرسائل الخاصة**\n" +
          "`/dm-all` `/dm-user` `/dm-embed`\n\n" +
          "**القوانين والسجلات**\n" +
          "`/laws-setup` `/laws-edit` `/laws-publish`\n" +
          "`/logs-setup` `/logs-settings` `/logs-delete`\n\n" +
          "**الترحيب والحماية**\n" +
          "`/welcome-setup` `/protection-setup`"
        )
        .setFooter({ text: "DRO BOT" });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

      return true;
    }

    // =========================
    // طرد عضو
    // =========================

    if (command === "kick") {
      if (!hasPermission(member, PermissionsBitField.Flags.KickMembers)) {
        return deny(interaction, "ما عندك صلاحية الطرد.");
      }

      const user = interaction.options.getUser("member");
      const reason =
        interaction.options.getString("reason") || "بدون سبب";

      const target = await guild.members.fetch(user.id);

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك معاقبة هذا العضو بسبب ترتيب الرتب.");
      }

      if (!target.kickable) {
        return deny(interaction, "لا أستطيع طرد هذا العضو. تحقق من ترتيب رتب البوت.");
      }

      await target.kick(reason);

      await interaction.reply(
        `تم طرد ${user.tag}.\nالسبب: ${reason}`
      );

      return true;
    }

    // =========================
    // حظر عضو
    // =========================

    if (command === "ban") {
      if (!hasPermission(member, PermissionsBitField.Flags.BanMembers)) {
        return deny(interaction, "ما عندك صلاحية الحظر.");
      }

      const user = interaction.options.getUser("member");
      const reason =
        interaction.options.getString("reason") || "بدون سبب";

      const target = await guild.members
        .fetch(user.id)
        .catch(() => null);

      if (target && !canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك حظر هذا العضو بسبب ترتيب الرتب.");
      }

      await guild.members.ban(user.id, { reason });

      await interaction.reply(
        `تم حظر ${user.tag}.\nالسبب: ${reason}`
      );

      return true;
    }

    // =========================
    // فك الحظر
    // =========================

    if (command === "unban") {
      if (!hasPermission(member, PermissionsBitField.Flags.BanMembers)) {
        return deny(interaction, "ما عندك صلاحية فك الحظر.");
      }

      const id = interaction.options.getString("userid");

      await guild.members.unban(id);

      await interaction.reply("تم فك الحظر بنجاح.");

      return true;
    }

    // =========================
    // إسكات عضو
    // =========================

    if (command === "timeout") {
      if (!hasPermission(member, PermissionsBitField.Flags.ModerateMembers)) {
        return deny(interaction, "ما عندك صلاحية الإسكات.");
      }

      const user = interaction.options.getUser("member");
      const minutes = interaction.options.getInteger("minutes");
      const reason =
        interaction.options.getString("reason") || "بدون سبب";

      const target = await guild.members.fetch(user.id);

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك إسكات هذا العضو بسبب ترتيب الرتب.");
      }

      if (!target.moderatable) {
        return deny(interaction, "لا أستطيع إسكات هذا العضو.");
      }

      await target.timeout(minutes * 60000, reason);

      await interaction.reply(
        `تم إسكات ${user.tag} لمدة ${minutes} دقيقة.\nالسبب: ${reason}`
      );

      return true;
    }

    // =========================
    // إزالة الإسكات
    // =========================

    if (command === "untimeout") {
      if (!hasPermission(member, PermissionsBitField.Flags.ModerateMembers)) {
        return deny(interaction, "ما عندك صلاحية إزالة الإسكات.");
      }

      const user = interaction.options.getUser("member");
      const target = await guild.members.fetch(user.id);

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك تعديل حالة هذا العضو.");
      }

      if (!target.moderatable) {
        return deny(interaction, "لا أستطيع إزالة الإسكات عن هذا العضو.");
      }

      await target.timeout(null);

      await interaction.reply(`تمت إزالة الإسكات عن ${user.tag}.`);

      return true;
    }

    // =========================
    // التحذيرات
    // =========================

    if (command === "warn") {
      if (!hasPermission(member, PermissionsBitField.Flags.ModerateMembers)) {
        return deny(interaction, "ما عندك صلاحية تحذير الأعضاء.");
      }

      const user = interaction.options.getUser("member");
      const reason =
        interaction.options.getString("reason") || "بدون سبب";

      const target = await guild.members
        .fetch(user.id)
        .catch(() => null);

      if (target && !canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك تحذير هذا العضو بسبب ترتيب الرتب.");
      }

      saveGuild(guild.id, data => {
        if (!data.warnings) data.warnings = {};
        if (!data.warnings[user.id]) data.warnings[user.id] = [];

        data.warnings[user.id].push({
          reason,
          moderator: interaction.user.id,
          date: Date.now()
        });
      });

      await interaction.reply(
        `⚠️ تم تحذير ${user.tag}.\nالسبب: ${reason}`
      );

      await user.send(
        `تم تحذيرك في سيرفر ${guild.name}.\nالسبب: ${reason}`
      ).catch(() => {});

      return true;
    }

    if (command === "warnings") {
      if (!hasPermission(member, PermissionsBitField.Flags.ModerateMembers)) {
        return deny(interaction, "ما عندك صلاحية عرض التحذيرات.");
      }

      const user = interaction.options.getUser("member");
      const data = getGuild(guild.id);
      const warnings = data.warnings?.[user.id] || [];

      if (!warnings.length) {
        return deny(interaction, `لا توجد تحذيرات مسجلة على ${user.tag}.`);
      }

      const description = warnings
        .map((warning, index) =>
          `**${index + 1}.** ${warning.reason}\n` +
          `بواسطة: <@${warning.moderator}>\n` +
          `التاريخ: <t:${Math.floor(warning.date / 1000)}:R>`
        )
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setColor("#ffb347")
        .setTitle(`تحذيرات ${user.tag}`)
        .setDescription(description.slice(0, 4000));

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

      return true;
    }

    if (command === "clear-warnings") {
      if (!hasPermission(member, PermissionsBitField.Flags.ModerateMembers)) {
        return deny(interaction, "ما عندك صلاحية مسح التحذيرات.");
      }

      const user = interaction.options.getUser("member");

      saveGuild(guild.id, data => {
        if (!data.warnings) data.warnings = {};
        data.warnings[user.id] = [];
      });

      await interaction.reply(
        `تم مسح جميع تحذيرات ${user.tag}.`
      );

      return true;
    }

    // =========================
    // مسح الرسائل
    // =========================

    if (command === "clear") {
      if (!hasPermission(member, PermissionsBitField.Flags.ManageMessages)) {
        return deny(interaction, "ما عندك صلاحية مسح الرسائل.");
      }

      if (!interaction.channel || !interaction.channel.isTextBased()) {
        return deny(interaction, "هذا الأمر يعمل داخل الرومات الكتابية فقط.");
      }

      const amount = interaction.options.getInteger("amount");

      const deleted = await interaction.channel.bulkDelete(amount, true);

      await interaction.reply({
        content: `تم حذف ${deleted.size} رسالة.`,
        ephemeral: true
      });

      return true;
    }

    // =========================
    // قفل وفتح الروم
    // =========================

    if (command === "lock" || command === "unlock") {
      if (!hasPermission(member, PermissionsBitField.Flags.ManageChannels)) {
        return deny(interaction, "ما عندك صلاحية إدارة الرومات.");
      }

      await interaction.channel.permissionOverwrites.edit(
        guild.roles.everyone,
        {
          SendMessages: command === "lock" ? false : null
        }
      );

      await interaction.reply(
        command === "lock"
          ? "🔒 تم قفل الروم."
          : "🔓 تم فتح الروم."
      );

      return true;
    }

    // =========================
    // إخفاء وإظهار الروم
    // =========================

    if (command === "hide" || command === "unhide") {
      if (!hasPermission(member, PermissionsBitField.Flags.ManageChannels)) {
        return deny(interaction, "ما عندك صلاحية إدارة الرومات.");
      }

      await interaction.channel.permissionOverwrites.edit(
        guild.roles.everyone,
        {
          ViewChannel: command === "hide" ? false : null
        }
      );

      await interaction.reply(
        command === "hide"
          ? "تم إخفاء الروم."
          : "تم إظهار الروم."
      );

      return true;
    }

    // =========================
    // إضافة وإزالة الرتب
    // =========================

    if (command === "role-add" || command === "role-remove") {
      if (!hasPermission(member, PermissionsBitField.Flags.ManageRoles)) {
        return deny(interaction, "ما عندك صلاحية إدارة الرتب.");
      }

      const user = interaction.options.getUser("member");
      const role = interaction.options.getRole("role");
      const target = await guild.members.fetch(user.id);

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك تعديل رتب هذا العضو.");
      }

      if (!canManageRole(interaction, role)) {
        return deny(interaction, "لا يمكنك استخدام هذه الرتبة بسبب ترتيب الرتب.");
      }

      if (!role.editable) {
        return deny(interaction, "رتبة البوت أقل من هذه الرتبة.");
      }

      if (command === "role-add") {
        await target.roles.add(role);
        await interaction.reply(`تم إعطاء رتبة ${role.name} إلى ${user.tag}.`);
      } else {
        await target.roles.remove(role);
        await interaction.reply(`تمت إزالة رتبة ${role.name} من ${user.tag}.`);
      }

      return true;
    }

    // =========================
    // تغيير الاسم
    // =========================

    if (command === "nickname") {
      if (!hasPermission(member, PermissionsBitField.Flags.ManageNicknames)) {
        return deny(interaction, "ما عندك صلاحية تغيير الأسماء.");
      }

      const user = interaction.options.getUser("member");
      const name = interaction.options.getString("name");
      const target = await guild.members.fetch(user.id);

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك تغيير اسم هذا العضو.");
      }

      if (!target.manageable) {
        return deny(interaction, "لا أستطيع تغيير اسم هذا العضو.");
      }

      await target.setNickname(name);

      await interaction.reply(`تم تغيير اسم ${user.tag} إلى ${name}.`);

      return true;
    }

    // =========================
    // نقل عضو صوتي
    // =========================

    if (command === "move") {
      if (!hasPermission(member, PermissionsBitField.Flags.MoveMembers)) {
        return deny(interaction, "ما عندك صلاحية نقل الأعضاء.");
      }

      if (!member.voice.channel) {
        return deny(interaction, "يجب أن تكون داخل روم صوتي أولاً.");
      }

      const user = interaction.options.getUser("member");
      const target = await guild.members.fetch(user.id);

      if (!target.voice.channel) {
        return deny(interaction, "هذا العضو ليس داخل روم صوتي.");
      }

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك نقل هذا العضو.");
      }

      await target.voice.setChannel(member.voice.channel);

      await interaction.reply(
        `تم نقل ${user.tag} إلى ${member.voice.channel.name}.`
      );

      return true;
    }

    // =========================
    // إخراج عضو من الصوتية
    // =========================

    if (command === "disconnect") {
      if (!hasPermission(member, PermissionsBitField.Flags.MoveMembers)) {
        return deny(interaction, "ما عندك صلاحية إخراج الأعضاء من الصوتية.");
      }

      const user = interaction.options.getUser("member");
      const target = await guild.members.fetch(user.id);

      if (!target.voice.channel) {
        return deny(interaction, "هذا العضو ليس داخل روم صوتي.");
      }

      if (!canManageTarget(interaction, target)) {
        return deny(interaction, "لا يمكنك إخراج هذا العضو.");
      }

      await target.voice.disconnect();

      await interaction.reply(`تم إخراج ${user.tag} من الروم الصوتي.`);

      return true;
    }

    // =========================
    // معلومات عضو
    // =========================

    if (command === "userinfo") {
      const user = interaction.options.getUser("member");
      const target = await guild.members.fetch(user.id);

      const embed = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle(`معلومات العضو: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "الاسم", value: user.username, inline: true },
          { name: "الآيدي", value: user.id, inline: true },
          {
            name: "تاريخ إنشاء الحساب",
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
            inline: false
          },
          {
            name: "تاريخ دخول السيرفر",
            value: target.joinedTimestamp
              ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>`
              : "غير معروف",
            inline: false
          },
          {
            name: "عدد الرتب",
            value: String(target.roles.cache.size - 1),
            inline: true
          },
          {
            name: "البوت",
            value: user.bot ? "نعم" : "لا",
            inline: true
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });

      return true;
    }

    // =========================
    // معلومات السيرفر
    // =========================

    if (command === "serverinfo") {
      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle(`معلومات السيرفر: ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: "اسم السيرفر", value: guild.name, inline: true },
          { name: "الآيدي", value: guild.id, inline: true },
          { name: "المالك", value: `${owner.user.tag}`, inline: true },
          { name: "عدد الأعضاء", value: String(guild.memberCount), inline: true },
          { name: "عدد الرومات", value: String(guild.channels.cache.size), inline: true },
          { name: "عدد الرتب", value: String(guild.roles.cache.size), inline: true },
          {
            name: "تاريخ الإنشاء",
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
            inline: false
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });

      return true;
    }

    // =========================
    // إرسال رسالة لعضو
    // =========================

    if (command === "dm-user") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

      const user = interaction.options.getUser("member");
      const message = interaction.options.getString("message");

      await user.send(message);

      await interaction.reply({
        content: `تم إرسال الرسالة إلى ${user.tag}.`,
        ephemeral: true
      });

      return true;
    }

    // =========================
    // إرسال رسالة خاصة للجميع
    // =========================

    if (command === "dm-all" || command === "dm-embed") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

      await interaction.deferReply({ ephemeral: true });

      const members = await guild.members.fetch();

      let sent = 0;
      let failed = 0;

      let message;
      let embed;

      if (command === "dm-all") {
        message = interaction.options.getString("message");
      } else {
        const title = interaction.options.getString("title");
        const description = interaction.options.getString("message");

        embed = new EmbedBuilder()
          .setColor("#9b65ff")
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: "DRO BOT" })
          .setTimestamp();
      }

      for (const target of members.values()) {
        if (target.user.bot) continue;

        try {
          if (embed) {
            await target.send({ embeds: [embed] });
          } else {
            await target.send(message);
          }

          sent++;
        } catch {
          failed++;
        }
      }

      await interaction.editReply(
        `انتهى الإرسال.\n` +
        `تم الإرسال: ${sent}\n` +
        `تعذر الإرسال: ${failed}`
      );

      return true;
    }

    // =========================
    // إعداد القوانين
    // =========================

    if (command === "laws-setup") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

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

    // =========================
    // تعديل قانون
    // =========================

    if (command === "laws-edit") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

      const number = interaction.options.getInteger("number");
      const law = interaction.options.getString("law");

      let updated = false;

      saveGuild(guild.id, data => {
        if (data.laws.items[number - 1] !== undefined) {
          data.laws.items[number - 1] = law;
          updated = true;
        }
      });

      await interaction.reply({
        content: updated
          ? "تم تعديل القانون بنجاح."
          : "رقم القانون غير موجود. لا توجد إضافة قانون جديدة عبر هذا الأمر.",
        ephemeral: true
      });

      return true;
    }

    // =========================
    // نشر القوانين
    // =========================

    if (command === "laws-publish") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

      const data = getGuild(guild.id);
      const list = data.laws.items || [];

      if (!list.length) {
        return deny(interaction, "لم تتم إضافة أي قوانين حتى الآن.");
      }

      const channel =
        interaction.options.getChannel("channel") ||
        (data.laws.channelId
          ? guild.channels.cache.get(data.laws.channelId)
          : null);

      if (!channel || channel.type !== ChannelType.GuildText) {
        return deny(interaction, "حدد رومًا كتابيًا صحيحًا للقوانين.");
      }

      const description = list
        .map((law, index) => `**${index + 1}.** ${law}`)
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle(data.laws.title || "📜 قوانين السيرفر")
        .setDescription(description.slice(0, 4000))
        .setFooter({ text: "DRO BOT" });

      await channel.send({ embeds: [embed] });

      await interaction.reply({
        content: `تم نشر القوانين في ${channel}.`,
        ephemeral: true
      });

      return true;
    }

    // =========================
    // إعداد الترحيب
    // =========================

    if (command === "welcome-setup") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

      const channel = interaction.options.getChannel("channel");
      const message = interaction.options.getString("message");

      saveGuild(guild.id, data => {
        data.welcome.enabled = true;
        data.welcome.channelId = channel.id;
        data.welcome.message = message;
      });

      await interaction.reply({
        content: `تم حفظ إعدادات الترحيب في ${channel}.`,
        ephemeral: true
      });

      return true;
    }

    // =========================
    // إعداد الحماية
    // =========================

    if (command === "protection-setup") {
      if (!isAdmin(member)) {
        return deny(interaction, "هذا الأمر للإدارة فقط.");
      }

      const antispam = interaction.options.getBoolean("antispam");
      const antilinks = interaction.options.getBoolean("antilinks");
      const antimentions = interaction.options.getBoolean("antimentions");

      saveGuild(guild.id, data => {
        if (antispam !== null) {
          data.protection.antiSpam = antispam;
        }

        if (antilinks !== null) {
          data.protection.antiLinks = antilinks;
        }

        if (antimentions !== null) {
          data.protection.antiMentions = antimentions;
        }
      });

      const protection = getGuild(guild.id).protection;

      await interaction.reply({
        content:
          "تم حفظ إعدادات الحماية:\n" +
          `مكافحة السبام: ${protection.antiSpam ? "مفعلة" : "معطلة"}\n` +
          `منع الروابط: ${protection.antiLinks ? "مفعل" : "معطل"}\n` +
          `منع المنشنات: ${protection.antiMentions ? "مفعل" : "معطل"}`,
        ephemeral: true
      });

      return true;
    }

    // =========================
    // أمر غير معروف
    // =========================

    await deny(
      interaction,
      "هذا الأمر غير معروف أو لم تتم برمجته."
    );

    return true;

  } catch (error) {
    console.error("DRO BOT error:", error);

    const response = {
      content: "حدث خطأ أثناء تنفيذ الأمر. تأكد من صلاحيات البوت وترتيب الرتب.",
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
