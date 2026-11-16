
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

const { handleInteraction } = require("./handlers");
const {
  getGuild,
  loadDatabase,
  saveDatabase
} = require("./database");

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  throw new Error("لم يتم ضبط DISCORD_TOKEN في إعدادات الاستضافة.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#9b65ff")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function saveGuild(guildId, callback) {
  getGuild(guildId);

  const database = loadDatabase();
  callback(database.guilds[guildId]);
  saveDatabase(database);
}

async function log(guild, description) {
  try {
    const data = getGuild(guild.id);

    if (!data.logs.enabled || !data.logs.channelId) return;

    const channel = guild.channels.cache.get(data.logs.channelId);

    if (channel && channel.isTextBased()) {
      await channel.send({
        embeds: [
          makeEmbed("📋 سجل السيرفر", description)
        ]
      });
    }
  } catch (error) {
    console.error("Log error:", error);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`DRO BOT is online: ${client.user.tag}`);
  client.user.setActivity("DRO BOT | الدعم الفني");
});

// نشر لوحة التذاكر
async function publishTicketPanel(interaction) {
  if (!isAdmin(interaction.member)) {
    await interaction.reply({
      content: "هذا الأمر للإدارة فقط.",
      ephemeral: true
    });
    return;
  }

  const channel =
    interaction.options.getChannel("channel") ||
    interaction.channel;

  const title = interaction.options.getString("title");
  const description = interaction.options.getString("description");
  const support = interaction.options.getRole("support");

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "حدد رومًا نصيًا صالحًا.",
      ephemeral: true
    });
    return;
  }

  saveGuild(interaction.guild.id, data => {
    data.tickets.panelChannelId = channel.id;

    if (support) {
      data.tickets.supportRoleId = support.id;
    }
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dro_ticket_open")
      .setLabel("فتح تذكرة")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    embeds: [
      makeEmbed(title, description)
    ],
    components: [row]
  });

  await interaction.reply({
    content: `تم نشر لوحة التذاكر في ${channel}.`,
    ephemeral: true
  });
}

// فتح تذكرة
async function openTicket(interaction) {
  const guild = interaction.guild;
  const data = getGuild(guild.id);

  const database = loadDatabase();
  const tickets = database.guilds[guild.id].tickets;

  const existingId = tickets.openTickets[interaction.user.id];

  if (existingId) {
    const existing = guild.channels.cache.get(existingId);

    if (existing) {
      await interaction.reply({
        content: `لديك تذكرة مفتوحة بالفعل: ${existing}`,
        ephemeral: true
      });
      return;
    }

    delete tickets.openTickets[interaction.user.id];
    saveDatabase(database);
  }

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ];

  if (data.tickets.supportRoleId) {
    permissionOverwrites.push({
      id: data.tickets.supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 90),
    type: ChannelType.GuildText,
    parent: data.tickets.categoryId || undefined,
    permissionOverwrites
  });

  saveGuild(guild.id, serverData => {
    serverData.tickets.openTickets[interaction.user.id] =
      ticketChannel.id;
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dro_ticket_close")
      .setLabel("إغلاق التذكرة")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: `${interaction.user} أهلاً بك في الدعم الفني.`,
    components: [row]
  });

  await interaction.reply({
    content: `تم فتح تذكرتك: ${ticketChannel}`,
    ephemeral: true
  });

  await log(guild, `تم فتح تذكرة بواسطة ${interaction.user.tag}`);
}

// إغلاق تذكرة
async function closeTicket(interaction) {
  const guild = interaction.guild;
  const data = getGuild(guild.id);
  const channelId = interaction.channel.id;

  const database = loadDatabase();
  const openTickets = database.guilds[guild.id].tickets.openTickets;

  const ticketOwner = Object.entries(openTickets)
    .find(([, id]) => id === channelId);

  const isOwner = ticketOwner &&
    ticketOwner[0] === interaction.user.id;

  const isSupport = data.tickets.supportRoleId &&
    interaction.member.roles.cache.has(data.tickets.supportRoleId);

  if (!isAdmin(interaction.member) && !isSupport && !isOwner) {
    await interaction.reply({
      content: "ليس لديك صلاحية إغلاق هذه التذكرة.",
      ephemeral: true
    });
    return;
  }

  if (!ticketOwner) {
    await interaction.reply({
      content: "لم أجد صاحب هذه التذكرة في قاعدة البيانات.",
      ephemeral: true
    });
    return;
  }

  delete openTickets[ticketOwner[0]];
  saveDatabase(database);

  await interaction.reply({
    content: "🔒 سيتم حذف التذكرة خلال 5 ثوانٍ."
  });

  await log(guild, `تم إغلاق تذكرة بواسطة ${interaction.user.tag}`);

  setTimeout(() => {
    interaction.channel.delete().catch(console.error);
  }, 5000);
}

// استقبال الأوامر والأزرار
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ticket") {
        await publishTicketPanel(interaction);
        return;
      }

      await handleInteraction(interaction);
      return;
    }

    if (!interaction.isButton() || !interaction.guild) return;

    if (interaction.customId === "dro_ticket_open") {
      await openTicket(interaction);
      return;
    }

    if (interaction.customId === "dro_ticket_close") {
      await closeTicket(interaction);
      return;
    }
  } catch (error) {
    console.error("DRO BOT interaction error:", error);

    const response = {
      content: "حدث خطأ. تأكد من صلاحيات البوت وإعداداته.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

// تسجيل إنشاء الرومات وحذفها
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

// تسجيل دخول وخروج وانتقال الأعضاء في الصوتيات
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
