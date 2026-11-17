
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const { getGuild, loadDatabase, saveDatabase } = require("./database");

function saveTickets(guildId, callback) {
  getGuild(guildId);
  const database = loadDatabase();
  const guild = database.guilds[guildId];

  callback(guild.tickets);

  saveDatabase(database);
}

function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function isSupport(interaction, tickets) {
  return (
    isAdmin(interaction.member) ||
    (tickets.supportRoleId &&
      interaction.member.roles.cache.has(tickets.supportRoleId))
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

async function createTicket(interaction) {
  const guild = interaction.guild;
  const tickets = getGuild(guild.id).tickets;

  const existing = Object.values(tickets.openTickets).find(
    ticket => ticket.userId === interaction.user.id
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

  const safeName = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 15);

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

  const channel = await guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: tickets.categoryId || undefined,
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
      `${tickets.welcomeMessage}\n\nيرجى توضيح مشكلتك وسيتم الرد عليك قريباً.`
    )
    .setFooter({ text: "DRO BOT" })
    .setTimestamp();

  await channel.send({
    content: `${interaction.user}${tickets.supportRoleId ? ` <@&${tickets.supportRoleId}>` : ""}`,
    embeds: [embed],
    components: [controlButtons()]
  });

  return interaction.reply({
    content: `تم فتح تذكرتك بنجاح: ${channel}`,
    ephemeral: true
  });
}

async function closeTicket(interaction, reopen = false) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets[interaction.channel.id];

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
      content: "ليس لديك صلاحية لهذا الإجراء.",
      ephemeral: true
    });
  }

  if (reopen) {
    if (!isSupport(interaction, tickets)) {
      return interaction.reply({
        content: "فقط الإدارة أو فريق الدعم يمكنهم إعادة فتح التذكرة.",
        ephemeral: true
      });
    }

    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });

    saveTickets(interaction.guild.id, data => {
      data.openTickets[interaction.channel.id].closed = false;
    });

    return interaction.reply("تمت إعادة فتح التذكرة.");
  }

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {
    SendMessages: false
  });

  saveTickets(interaction.guild.id, data => {
    data.openTickets[interaction.channel.id].closed = true;
  });

  return interaction.reply("🔒 تم إغلاق التذكرة.");
}

async function claimTicket(interaction) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets[interaction.channel.id];

  if (!ticket) {
    return interaction.reply({
      content: "هذه القناة ليست تذكرة.",
      ephemeral: true
    });
  }

  if (!isSupport(interaction, tickets)) {
    return interaction.reply({
      content: "هذا الأمر لفريق الدعم والإدارة فقط.",
      ephemeral: true
    });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: "تم استلام هذه التذكرة مسبقاً.",
      ephemeral: true
    });
  }

  saveTickets(interaction.guild.id, data => {
    data.openTickets[interaction.channel.id].claimedBy = interaction.user.id;
  });

  return interaction.reply(`🙋 تم استلام التذكرة بواسطة ${interaction.user}`);
}

async function deleteTicket(interaction) {
  const tickets = getGuild(interaction.guild.id).tickets;
  const ticket = tickets.openTickets[interaction.channel.id];

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

  await interaction.reply("🗑️ سيتم حذف التذكرة الآن.");

  saveTickets(interaction.guild.id, data => {
    delete data.openTickets[interaction.channel.id];
  });

  await interaction.channel.delete();
}

async function handleTicketInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "dro_ticket_open") {
        await createTicket(interaction);
        return true;
      }

      if (interaction.customId === "dro_ticket_close") {
        await closeTicket(interaction);
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
    const tickets = interaction.guild
      ? getGuild(interaction.guild.id).tickets
      : null;

    if (!tickets) return false;

    if (name === "ticket") {
      const title = interaction.options.getString("title", true);
      const description = interaction.options.getString("description", true);
      const channel = interaction.options.getChannel("channel", false);
      const support = interaction.options.getRole("support", false);

      if (support) {
        saveTickets(interaction.guild.id, data => {
          data.supportRoleId = support.id;
        });
      }

      const target = channel || interaction.channel;

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: "DRO BOT | الدعم الفني" });

      await target.send({
        embeds: [embed],
        components: [ticketButtons()]
      });

      return interaction.reply({
        content: `تم إرسال لوحة التذاكر في ${target}.`,
        ephemeral: true
      });
    }

    if (name === "ticket-setup" || name === "ticket-settings") {
      const channel = interaction.options.getChannel("channel", false);
      const support = interaction.options.getRole("support", false);

      saveTickets(interaction.guild.id, data => {
        if (channel) {
          if (channel.type === ChannelType.GuildCategory) {
            data.categoryId = channel.id;
          } else {
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
        interaction.options.getChannel("channel", false) ||
        (tickets.panelChannelId
          ? interaction.guild.channels.cache.get(tickets.panelChannelId)
          : null) ||
        interaction.channel;

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎫 الدعم الفني")
        .setDescription(tickets.welcomeMessage)
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

    if (name === "ticket-open") {
      await closeTicket(interaction, true);
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

    if (name === "ticket-add" || name === "ticket-remove") {
      const ticket = tickets.openTickets[interaction.channel.id];

      if (!ticket) {
        await interaction.reply({
          content: "هذه القناة ليست تذكرة.",
          ephemeral: true
        });
        return true;
      }

      if (!isSupport(interaction, tickets)) {
        await interaction.reply({
          content: "هذا الأمر لفريق الدعم والإدارة فقط.",
          ephemeral: true
        });
        return true;
      }

      const member = interaction.options.getUser("member", true);

      if (name === "ticket-add") {
        await interaction.channel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });

        await interaction.reply(`تمت إضافة ${member} إلى التذكرة.`);
      } else {
        await interaction.channel.permissionOverwrites.delete(member.id);

        await interaction.reply(`تمت إزالة ${member} من التذكرة.`);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error("Ticket system error:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "حدث خطأ أثناء تنفيذ أمر التذاكر. تأكد من صلاحيات البوت.",
        ephemeral: true
      }).catch(() => {});
    }

    return true;
  }
}

module.exports = { handleTicketInteraction };
