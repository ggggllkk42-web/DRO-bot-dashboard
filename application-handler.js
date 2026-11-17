const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const {
  getGuild,
  loadDatabase,
  saveDatabase
} = require("./database");

function saveApplications(guildId, callback) {
  getGuild(guildId);

  const db = loadDatabase();
  const applications = db.guilds[guildId].applications;

  callback(applications);
  saveDatabase(db);
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function canReview(member, settings) {
  return (
    isAdmin(member) ||
    (
      settings.reviewRoleId &&
      member.roles.cache.has(settings.reviewRoleId)
    )
  );
}

function applicationQuestions() {
  return [
    ["name", "ما اسمك؟"],
    ["age", "كم عمرك؟"],
    ["experience", "ما خبرتك الإدارية؟"],
    ["reason", "لماذا تريد الانضمام للإدارة؟"],
    ["time", "كم ساعة تستطيع التواجد؟"]
  ];
}

async function sendPrivateResult(client, userId, message) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(message);
    return true;
  } catch {
    return false;
  }
}

async function handleApplicationInteraction(interaction) {
  const command = interaction.isChatInputCommand()
    ? interaction.commandName
    : null;

  const isApplyButton =
    interaction.isButton() &&
    interaction.customId.startsWith("dro_apply_");

  const isApplyModal =
    interaction.isModalSubmit() &&
    interaction.customId === "dro_apply_modal";

  if (
    !isApplyButton &&
    !isApplyModal &&
    !["apply-setup", "apply-panel", "apply-settings"].includes(command)
  ) {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content: "هذا النظام يعمل داخل السيرفر فقط.",
      ephemeral: true
    }).catch(() => {});
    return true;
  }

  const guild = interaction.guild;
  const guildId = guild.id;

  try {
    if (command) {
      if (!isAdmin(interaction.member)) {
        await interaction.reply({
          content: "هذا الأمر للإدارة فقط.",
          ephemeral: true
        });
        return true;
      }

      if (command === "apply-setup") {
        const channel = interaction.options.getChannel("channel");
        const review = interaction.options.getChannel("review");
        const role = interaction.options.getRole("role");
        const acceptedRole =
          interaction.options.getRole("accepted-role");

        if (
          !channel ||
          channel.type !== ChannelType.GuildText ||
          !review ||
          review.type !== ChannelType.GuildText
        ) {
          await interaction.reply({
            content: "حدد روم لوحة التقديم وروم استقبال الطلبات بشكل صحيح.",
            ephemeral: true
          });
          return true;
        }

        saveApplications(guildId, data => {
          data.channelId = channel.id;
          data.reviewChannelId = review.id;
          data.reviewRoleId = role?.id || null;
          data.acceptedRoleId = acceptedRole?.id || null;
        });

        await interaction.reply({
          content: "تم حفظ إعدادات نظام التقديم بنجاح.",
          ephemeral: true
        });
        return true;
      }

      if (command === "apply-panel") {
        const data = getGuild(guildId).applications;

        const channel =
          interaction.options.getChannel("channel") ||
          (
            data.channelId
              ? guild.channels.cache.get(data.channelId)
              : null
          ) ||
          interaction.channel;

        if (!channel || channel.type !== ChannelType.GuildText) {
          await interaction.reply({
            content: "حدد رومًا كتابيًا صحيحًا لنشر لوحة التقديم.",
            ephemeral: true
          });
          return true;
        }

        saveApplications(guildId, settings => {
          settings.channelId = channel.id;
        });

        const embed = new EmbedBuilder()
          .setColor("#9b65ff")
          .setTitle("📋 التقديم على الإدارة")
          .setDescription(
            "مرحبًا بك في نظام التقديم على الإدارة.\n\n" +
            "اضغط الزر بالأسفل واملأ جميع الأسئلة بعناية."
          )
          .setFooter({ text: "DRO BOT" })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("dro_apply_start")
            .setLabel("تقديم طلب")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({
          embeds: [embed],
          components: [row]
        });

        await interaction.reply({
          content: `تم نشر لوحة التقديم في ${channel}.`,
          ephemeral: true
        });
        return true;
      }

      if (command === "apply-settings") {
        const data = getGuild(guildId).applications;

        await interaction.reply({
          content:
            "إعدادات نظام التقديم الحالية:\n" +
            `روم اللوحة: ${data.channelId ? `<#${data.channelId}>` : "غير محدد"}\n` +
            `روم استقبال الطلبات: ${data.reviewChannelId ? `<#${data.reviewChannelId}>` : "غير محدد"}\n` +
            `رتبة المراجعة: ${data.reviewRoleId ? `<@&${data.reviewRoleId}>` : "الإدارة فقط"}\n` +
            `رتبة المقبولين: ${data.acceptedRoleId ? `<@&${data.acceptedRoleId}>` : "غير محددة"}`,
          ephemeral: true
        });
        return true;
      }
    }

    if (isApplyButton) {
      const customId = interaction.customId;

      if (customId === "dro_apply_start") {
        const data = getGuild(guildId).applications;

        if (!data.reviewChannelId) {
          await interaction.reply({
            content: "نظام التقديم غير مكتمل الإعداد. يرجى إبلاغ الإدارة.",
            ephemeral: true
          });
          return true;
        }

        const questions = applicationQuestions();

        const modal = new ModalBuilder()
          .setCustomId("dro_apply_modal")
          .setTitle("نموذج التقديم");

        const fields = questions.map(([id, label]) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(500)
          )
        );

        modal.addComponents(...fields);

        await interaction.showModal(modal);
        return true;
      }

      if (
        customId.startsWith("dro_apply_accept_") ||
        customId.startsWith("dro_apply_reject_")
      ) {
        const settings = getGuild(guildId).applications;

        if (!canReview(interaction.member, settings)) {
          await interaction.reply({
            content: "هذا الإجراء للإدارة أو رتبة مراجعة الطلبات فقط.",
            ephemeral: true
          });
          return true;
        }

        const accepted = customId.startsWith("dro_apply_accept_");

        const id = customId.replace(
          accepted ? "dro_apply_accept_" : "dro_apply_reject_",
          ""
        );

        const db = loadDatabase();
        const applications = db.guilds[guildId]?.applications;
        const submission = applications?.submissions?.[id];

        if (!submission || submission.status !== "pending") {
          await interaction.reply({
            content: "هذا الطلب غير موجود أو تمت معالجته مسبقًا.",
            ephemeral: true
          });
          return true;
        }

        if (accepted && applications.acceptedRoleId) {
          const target = await guild.members
            .fetch(submission.userId)
            .catch(() => null);

          if (!target) {
            await interaction.reply({
              content: "تعذر العثور على المتقدم لإعطائه الرتبة. لم يتم قبول الطلب.",
              ephemeral: true
            });
            return true;
          }

          try {
            await target.roles.add(
              applications.acceptedRoleId,
              "قبول طلب التقديم"
            );
          } catch (error) {
            console.error("Accepted role error:", error);

            await interaction.reply({
              content: "تعذر إعطاء رتبة القبول. تأكد من صلاحيات البوت وترتيب الرتب.",
              ephemeral: true
            });
            return true;
          }
        }

        submission.status = accepted ? "accepted" : "rejected";
        submission.reviewedBy = interaction.user.id;
        submission.reviewedAt = Date.now();

        saveDatabase(db);

        await sendPrivateResult(
          interaction.client,
          submission.userId,
          accepted
            ? `🎉 تم قبول طلب تقديمك في سيرفر ${guild.name}.`
            : `نشكرك على تقديمك في سيرفر ${guild.name}، نعتذر عن قبول طلبك هذه المرة.`
        );

        await interaction.update({
          content: accepted
            ? `✅ تم قبول الطلب بواسطة ${interaction.user}.`
            : `❌ تم رفض الطلب بواسطة ${interaction.user}.`,
          embeds: [],
          components: []
        });

        return true;
      }
    }

    if (isApplyModal) {
      const data = getGuild(guildId).applications;

      const reviewChannel = data.reviewChannelId
        ? guild.channels.cache.get(data.reviewChannelId)
        : null;

      if (!reviewChannel || reviewChannel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "روم استقبال الطلبات غير مضبوط. تواصل مع الإدارة.",
          ephemeral: true
        });
        return true;
      }

      const id = `${Date.now()}_${interaction.user.id}`;

      const answers = applicationQuestions().map(([field, label]) => [
        label,
        interaction.fields.getTextInputValue(field)
      ]);

      const submission = {
        userId: interaction.user.id,
        status: "pending",
        answers,
        createdAt: Date.now()
      };

      saveApplications(guildId, applications => {
        if (!applications.submissions) {
          applications.submissions = {};
        }

        applications.submissions[id] = submission;
      });

      const embed = new EmbedBuilder()
        .setColor("#9b65ff")
        .setTitle("📥 طلب تقديم جديد")
        .setDescription(
          `المتقدم: ${interaction.user}\n\n` +
          answers.map(([question, answer]) =>
            `**${question}:**\n${answer}`
          ).join("\n\n")
        )
        .setFooter({ text: `رقم الطلب: ${id}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dro_apply_accept_${id}`)
          .setLabel("قبول")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`dro_apply_reject_${id}`)
          .setLabel("رفض")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      await reviewChannel.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: "تم إرسال طلبك بنجاح. بالتوفيق!",
        ephemeral: true
      });

      return true;
    }

    return true;

  } catch (error) {
    console.error("Application handler error:", error);

    const response = {
      content: "حدث خطأ في نظام التقديم. تأكد من إعدادات البوت وصلاحياته.",
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

module.exports = {
  handleApplicationInteraction
};
