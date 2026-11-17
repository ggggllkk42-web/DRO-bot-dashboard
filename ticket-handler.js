
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const {
  getGuild,
  loadDatabase,
  saveDatabase
} = require("./database");

function saveTickets(guildId, callback) {
  getGuild(guildId);

  const database = loadDatabase();
  const guildData = database.guilds[guildId];

  if (!guildData.tickets) guildData.tickets = {};
  if (!guildData.tickets.openTickets) {
    guildData.tickets.openTickets = {};
  }

  callback(guildData.tickets);
  saveDatabase(database);
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function isSupport(interaction, tickets) {
  return (
    isAdmin(interaction.member) ||
    (
      tickets.supportRoleId &&
      interaction.member.roles.cache.has(tickets.supportRoleId)
    )
  );
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dro_ticket_open")
      .setLabel("فتح تذكرة")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Success)
  );
}

function controlButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dro_ticket_claim")
      .setLabel("استلام")
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("dro_ticket_close")
      .setLabel("إغلاق")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dro_ticket_delete")
      .setLabel("حذف")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
  );
}

function reopenButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dro_ticket_reopen")
      .setLabel("إعادة فتح التذكرة")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success)
  );
}

async function createTicket(interaction) {
  const guild = interaction.guild;
  const tickets = getGuild(guild.id).tickets;
  const openTickets = tickets.openTickets || {};

  const existing = Object.values(openTickets).find(
    ticket =>
      ticket.userId === interaction.user.id &&
      !ticket.closed
  );

  if (existing) {
    const oldChannel = guild.channels.cache.get(existing.channelId);

    if (oldChannel) {
      return interaction.reply({
        content: `لديك تذكرة مفتوحة بالفعل: ${oldChannel}`,
        ephemeral: true
      });
    }

    saveTickets(guild.id, data => {
      delete data.openTickets[existing.channelId];
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const safeName = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 15)
    .replace(/^-|-$/g, "") || "member";

  const permissions = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles
      ]
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels
      ]
    }
  ];

  if (tickets.supportRoleId) {
    permissions.push({
      id: tickets.supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const category = tickets.categoryId
    ? guild.channels.cache.get(tickets.categoryId)
    : null;

  const channel = await guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: category?.type === ChannelType.GuildCategory
      ? category.id
      : undefined,
    permissionOverwrites: permissions
  });

  saveTickets(guild.id, data => {
    data.openTickets[channel.id] = {
      channelId: channel.id,
      userId: interaction.user.id,
      claimedBy: null,
      closed: false,
      createdAt: Date.now()
    };
  });

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎫 تذكرة الدعم الفني")
    .setDescription(
      `${tickets.welcomeMessage || "أهلاً بك في الدعم الفني."}\n\nيرجى توضيح مشكلتك وسيتم الرد عليك قريباً.`
    )
    .setFooter({ text: "DRO BOT" })
    .setTimestamp();

  await channel.send({
    content: `${interaction.user}${tickets.supportRoleId ? ` <@&${tickets.supportRoleId}>` : ""}`,
    embeds: [embed],
    components: [controlButtons()]
  });

  return interaction.editReply({
    content: `تم فتح تذكرتك بنجاح: ${channel}`
  });
}

async function closeTicket(interaction) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets?.[interaction.channel.id];

  if (!ticket) {
    return interaction.reply({
      content: "هذه القناة ليست تذكرة مسجلة.",
      ephemeral: true
    });
  }

  const allowed =
    isSupport(interaction, tickets) ||
    ticket.userId === interaction.user.id;

  if (!allowed) {
    return interaction.reply({
      content: "ليس لديك صلاحية لإغلاق هذه التذكرة.",
      ephemeral: true
    });
  }

  if (ticket.closed) {
    return interaction.reply({
      content: "التذكرة مغلقة بالفعل.",
      ephemeral: true
    });
  }

  await interaction.channel.permissionOverwrites.edit(
    ticket.userId,
    { SendMessages: false }
  );

  saveTickets(interaction.guild.id, data => {
    data.openTickets[interaction.channel.id].closed = true;
  });

  await interaction.reply({
    content: "🔒 تم إغلاق التذكرة. يمكن لفريق الدعم إعادة فتحها.",
    ephemeral: true
  });

  await interaction.channel.send({
    content: "🔒 تم إغلاق هذه التذكرة.",
    components: [reopenButtons()]
  });
}

async function reopenTicket(interaction) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets?.[interaction.channel.id];

  if (!ticket) {
    return interaction.reply({
      content: "هذه القناة ليست تذكرة مسجلة.",
      ephemeral: true
    });
  }

  if (!isSupport(interaction, tickets)) {
    return interaction.reply({
      content: "فقط الإدارة أو فريق الدعم يمكنهم إعادة فتح التذكرة.",
      ephemeral: true
    });
  }

  if (!ticket.closed) {
    return interaction.reply({
      content: "التذكرة مفتوحة بالفعل.",
      ephemeral: true
    });
  }

  await interaction.channel.permissionOverwrites.edit(
    ticket.userId,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    }
  );

  saveTickets(interaction.guild.id, data => {
    data.openTickets[interaction.channel.id].closed = false;
  });

  await interaction.reply({
    content: "🔓 تمت إعادة فتح التذكرة.",
    ephemeral: true
  });

  await interaction.channel.send({
    content: "🔓 تم إعادة فتح التذكرة.",
    components: [controlButtons()]
  });
}

async function claimTicket(interaction) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets?.[interaction.channel.id];

  if (!ticket) {
    return interaction.reply({
      content: "هذه القناة ليست تذكرة.",
      ephemeral: true
    });
  }

  if (!isSupport(interaction, tickets)) {
    return interaction.reply({
      content: "هذا الإجراء لفريق الدعم والإدارة فقط.",
      ephemeral: true
    });
  }

  if (ticket.closed) {
    return interaction.reply({
      content: "لا يمكن استلام تذكرة مغلقة.",
      ephemeral: true
    });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: `تم استلام هذه التذكرة مسبقاً بواسطة <@${ticket.claimedBy}>.`,
      ephemeral: true
    });
  }

  saveTickets(interaction.guild.id, data => {
    data.openTickets[interaction.channel.id].claimedBy =
      interaction.user.id;
  });

  return interaction.reply({
    content: `🙋 تم استلام التذكرة بواسطة ${interaction.user}.`,
    ephemeral: false
  });
}

async function deleteTicket(interaction) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets?.[interaction.channel.id];

  if (!ticket) {
    return interaction.reply({
      content: "هذه القناة ليست تذكرة.",
      ephemeral: true
    });
  }

  if (!isSupport(interaction, tickets)) {
    return interaction.reply({
      content: "فقط الإدارة أو فريق الدعم يمكنهم حذف التذكرة.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🗑️ سيتم حذف التذكرة الآن.",
    ephemeral: true
  });

  saveTickets(interaction.guild.id, data => {
    delete data.openTickets[interaction.channel.id];
  });

  await interaction.channel.delete();
}

async function handleTicketInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      if (!interaction.guild) return false;

      if (interaction.customId === "dro_ticket_open") {
        await createTicket(interaction);
        return true;
      }

      if (interaction.customId === "dro_ticket_close") {
        await closeTicket(interaction);
        return true;
      }

      if (interaction.customId === "dro_ticket_reopen") {
        await reopenTicket(interaction);
        return true;
      }

      if (interaction.customId === "dro_ticket_claim") {
        await claimTicket(interaction);
        return true;
      }

      if (interaction.customId === "dro_ticket_delete") {
        await deleteTicket(interaction);
        return true;
      }

      return false;
    }

    if (!interaction.isChatInputCommand()) return false;

    const name = interaction.commandName;

    if (!name.startsWith("ticket")) return false;

    if (!interaction.guild) {
      await interaction.reply({
        content: "هذا الأمر يعمل داخل السيرفر فقط.",
        ephemeral: true
      });
      return true;
    }

    const isSetupCommand = [
      "ticket-setup",
      "ticket-settings",
      "ticket-panel"
    ].includes(name);

    if (isSetupCommand && !isAdmin(interaction.member)) {
      await interaction.reply({
        content: "إعدادات التذاكر للإدارة فقط.",
        ephemeral: true
      });
      return true;
    }

    const tickets = getGuild(interaction.guild.id).tickets;

    if (name === "ticket-setup" || name === "ticket-settings") {
      const channel = interaction.options.getChannel("channel");
      const support = interaction.options.getRole("support");

      saveTickets(interaction.guild.id, data => {
        if (channel) {
          if (channel.type === ChannelType.GuildCategory) {
            data.categoryId = channel.id;
          } else if (channel.type === ChannelType.GuildText) {
            data.panelChannelId = channel.id;
          }
        }

        if (support) data.supportRoleId = support.id;
      });

      return interaction.reply({
        content: "تم حفظ إعدادات التذاكر بنجاح.",
        ephemeral: true
      });
    }

    if (name === "ticket-panel") {
      const channel =
        interaction.options.getChannel("channel") ||
        (
          tickets.panelChannelId
            ? interaction.guild.channels.cache.get(tickets.panelChannelId)
            : null
        ) ||
        interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({
          content: "حدد رومًا كتابيًا صحيحًا لنشر لوحة التذاكر.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎫 الدعم الفني")
        .setDescription(
          tickets.welcomeMessage ||
          "اضغط الزر بالأسفل لفتح تذكرة دعم فني."
        )
        .setFooter({ text: "DRO BOT" });

      await channel.send({
        embeds: [embed],
        components: [ticketButtons()]
      });

      return interaction.reply({
        content: `تم إرسال لوحة التذاكر في ${channel}.`,
        ephemeral: true
      });
    }

    if (name === "ticket-close") {
      await closeTicket(interaction);
      return true;
    }

    if (name === "ticket-claim") {
      await claimTicket(interaction);
      return true;
    }

    if (name === "ticket-delete") {
      await deleteTicket(interaction);
      return true;
    }

    await interaction.reply({
      content: "هذا الأمر غير مدعوم حاليًا.",
      ephemeral: true
    });

    return true;

  } catch (error) {
    console.error("Ticket system error:", error);

    if (interaction.isRepliable()) {
      const response = {
        content: "حدث خطأ أثناء تنفيذ أمر التذاكر. تأكد من صلاحيات البوت.",
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response).catch(() => {});
      } else {
        await interaction.reply(response).catch(() => {});
      }
    }

    return true;
  }
}

module.exports = { handleTicketInteraction };
