
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require("discord.js");

const {
  getGuild,
  loadDatabase,
  saveDatabase
} = require("./database");

function saveGuild(guildId, callback) {
  getGuild(guildId);
  const db = loadDatabase();
  callback(db.guilds[guildId].applications);
  saveDatabase(db);
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
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
    interaction.customId.startsWith("dro_apply_");

  if (
    !isApplyButton &&
    !isApplyModal &&
    command !== "apply-setup" &&
    command !== "apply-panel" &&
    command !== "apply-settings"
  ) {
    return false;
  }

  if (!interaction.guild) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: "هذا النظام يعمل داخل السيرفر فقط.",
        ephemeral: true
      });
    }
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

        if (!channel || !review) {
          await interaction.reply({
            content: "حدد روم لوحة التقديم وروم استقبال الطلبات.",
            ephemeral: true
          });
          return true;
        }

        saveGuild(guildId, data => {
          data.channelId = channel.id;
          data.reviewChannelId = review.id;
          data.reviewRoleId = role?.id || null;
        });

        await interaction.reply({
          content: "تم حفظ إعدادات التقديم بنجاح.",
          ephemeral: true
        });
        return true;
      }

      if (command === "apply-panel") {
        const data = getGuild(guildId).applications;
        const channel =
          interaction.options.getChannel("channel") ||
          (data.channelId
            ? guild.channels.cache.get(data.channelId)
            : interaction.channel);

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: "حدد رومًا كتابيًا صحيحًا.",
            ephemeral: true
          });
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor("#9b65ff")
          .setTitle("📋 التقديم على الإدارة")
          .setDescription("اضغط الزر بالأسفل لبدء تقديم طلبك.");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("dro_apply_start")
            .setLabel("تقديم طلب")
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
        await interaction.reply({
          content: "إعدادات التقديم الأساسية محفوظة. يمكننا تطوير خياراتها لاحقًا.",
          ephemeral: true
        });
        return true;
      }
    }

    if (isApplyButton) {
      const customId = interaction.customId;

      if (customId === "dro_apply_start") {
        const modal = new ModalBuilder()
          .setCustomId("dro_apply_modal")
          .setTitle("نموذج التقديم");

        const questions = [
          ["name", "ما اسمك؟"],
          ["age", "كم عمرك؟"],
          ["experience", "ما خبرتك الإدارية؟"],
          ["reason", "لماذا تريد الانضمام للإدارة؟"],
          ["time", "كم ساعة تستطيع التواجد؟"]
        ];

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
        if (!isAdmin(interaction.member)) {
          await interaction.reply({
            content: "هذا الإجراء للإدارة فقط.",
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

        if (!submission) {
          await interaction.reply({
            content: "هذا الطلب غير موجود أو تمت معالجته.",
            ephemeral: true
          });
          return true;
        }

        submission.status = accepted ? "accepted" : "rejected";
        saveDatabase(db);

        if (accepted && applications.acceptedRoleId) {
          const target = await guild.members
            .fetch(submission.userId)
            .catch(() => null);

          if (target) {
            await target.roles.add(applications.acceptedRoleId)
              .catch(() => {});
          }
        }

        const applicant = await interaction.client.users
          .fetch(submission.userId)
          .catch(() => null);

        if (applicant) {
          await applicant.send(
            accepted
              ? `🎉 تم قبول طلب تقديمك في سيرفر ${guild.name}.`
              : `نشكرك على تقديمك في سيرفر ${guild.name}، نعتذر عن قبول طلبك هذه المرة.`
          ).catch(() => {});
        }

        await interaction.update({
          content: accepted ? "✅ تم قبول الطلب." : "❌ تم رفض الطلب.",
          embeds: [],
          components: []
        });
        return true;
      }
    }

    if (isApplyModal && interaction.customId === "dro_apply_modal") {
      const data = getGuild(guildId).applications;
      const reviewChannel = data.reviewChannelId
        ? guild.channels.cache.get(data.reviewChannelId)
        : null;

      if (!reviewChannel || !reviewChannel.isTextBased()) {
        await interaction.reply({
          content: "روم استقبال الطلبات غير مضبوط. تواصل مع الإدارة.",
          ephemeral: true
        });
        return true;
      }

      const id = `${Date.now()}_${interaction.user.id}`;

      const answers = [
        ["الاسم", interaction.fields.getTextInputValue("name")],
        ["العمر", interaction.fields.getTextInputValue("age")],
        ["الخبرة", interaction.fields.getTextInputValue("experience")],
        ["سبب التقديم", interaction.fields.getTextInputValue("reason")],
        ["وقت التواجد", interaction.fields.getTextInputValue("time")]
      ];

      saveGuild(guildId, applications => {
        if (!applications.submissions) {
          applications.submissions = {};
        }

        applications.submissions[id] = {
          userId: interaction.user.id,
          status: "pending",
          answers
        };
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
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dro_apply_accept_${id}`)
          .setLabel("قبول")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`dro_apply_reject_${id}`)
          .setLabel("رفض")
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
