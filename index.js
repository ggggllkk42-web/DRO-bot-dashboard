const { handleInteraction } = require("./handlers");
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

const PREFIX = "!";
const TOKEN = process.env.DISCORD_TOKEN;

const settings = new Map();
const tickets = new Map();
const applications = new Map();
const laws = new Map();
const shortcuts = new Map();

function getSettings(guildId) {
  if (!settings.has(guildId)) {
    settings.set(guildId, {
      logChannel: null,
      ticketCategory: null,
      ticketPanel: null,
      supportRole: null,
      applicationChannel: null,
      applicationReview: null,
      acceptedRole: null,
      lawChannel: null,
      questions: [],
      logs: true
    });
  }
  return settings.get(guildId);
}

function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function embed(title, description) {
  return new EmbedBuilder()
    .setColor("#9b65ff")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function log(guild, message) {
  const s = getSettings(guild.id);
  if (!s.logs || !s.logChannel) return;
  const channel = guild.channels.cache.get(s.logChannel);
  if (channel) channel.send({ embeds: [embed("📋 سجل السيرفر", message)] }).catch(() => {});
}

client.once(Events.ClientReady, () => {
  console.log(`DRO BOT is online: ${client.user.tag}`);
  client.user.setActivity("DRO BOT | !help");
});

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;

  const s = getSettings(message.guild.id);
  const args = message.content.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (shortcuts.has(message.guild.id + ":" + command)) {
    const original = shortcuts.get(message.guild.id + ":" + command);
    args.unshift(original);
  }

  if (!command.startsWith(PREFIX)) {
    const shortcut = shortcuts.get(message.guild.id + ":" + command);
    if (!shortcut) return;
  }

  const action = command.startsWith(PREFIX)
    ? command.slice(PREFIX.length)
    : shortcuts.get(message.guild.id + ":" + command);

  const target = message.mentions.members.first();
  const reason = args.slice(1).join(" ") || "بدون سبب";

  if (action === "help") {
    return message.reply({ embeds: [embed("DRO BOT | الأوامر",
      "`!kick @عضو` طرد\n" +
      "`!ban @عضو` حظر\n" +
      "`!unban ID` فك الحظر\n" +
      "`!timeout @عضو مدة` إسكات\n" +
      "`!warn @عضو` تحذير\n" +
      "`!clear عدد` مسح رسائل\n" +
      "`!lock` قفل الروم\n" +
      "`!unlock` فتح الروم\n" +
      "`!log روم` تحديد اللوق\n" +
      "`!ticket` نشر لوحة التذاكر\n" +
      "`!ticketcategory ID` تحديد كاتقوري التذاكر\n" +
      "`!supportrole ID` رتبة الدعم\n" +
      "`!applychannel روم` روم التقديم\n" +
      "`!addquestion السؤال` إضافة سؤال\n" +
      "`!reviewrole ID` رتبة مراجعة التقديم\n" +
      "`!acceptrole ID` رتبة القبول\n" +
      "`!lawchannel روم` روم القوانين\n" +
      "`!addlaw نص` إضافة قانون\n" +
      "`!publishlaws` نشر القوانين\n" +
      "`!shortcut اختصار أمر` إضافة اختصار\n" +
      "`!logs on/off` تشغيل وإيقاف اللوقات"
    )] });
  }

  if (action === "kick" && isAdmin(message.member)) {
    if (!target) return message.reply("حدد العضو.");
    await target.kick(reason);
    await message.reply(`تم طرد ${target.user.tag}`);
    return log(message.guild, `طرد ${target.user.tag} بواسطة ${message.author.tag}`);
  }

  if (action === "ban" && isAdmin(message.member)) {
    if (!target) return message.reply("حدد العضو.");
    await target.ban({ reason });
    await message.reply(`تم حظر ${target.user.tag}`);
    return log(message.guild, `حظر ${target.user.tag} بواسطة ${message.author.tag}`);
  }

  if (action === "unban" && isAdmin(message.member)) {
    const id = args[0];
    if (!id) return message.reply("اكتب ID العضو.");
    await message.guild.members.unban(id, reason);
    return message.reply("تم فك الحظر.");
  }

  if (action === "timeout" && isAdmin(message.member)) {
    if (!target) return message.reply("حدد العضو.");
    const minutes = Number(args[1]) || 10;
    await target.timeout(minutes * 60000, reason);
    return message.reply(`تم إسكات ${target.user.tag}`);
  }

  if (action === "warn" && isAdmin(message.member)) {
    if (!target) return message.reply("حدد العضو.");
    await target.send(`⚠️ تم تحذيرك في ${message.guild.name}\nالسبب: ${reason}`).catch(() => {});
    return message.reply(`تم تحذير ${target.user.tag}`);
  }

  if (action === "clear" && isAdmin(message.member)) {
    const count = Math.min(Number(args[0]) || 10, 100);
    const deleted = await message.channel.bulkDelete(count, true);
    return message.channel.send(`تم مسح ${deleted.size} رسالة.`).then(m => {
      setTimeout(() => m.delete().catch(() => {}), 5000);
    });
  }

  if (action === "lock" && isAdmin(message.member)) {
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false
    });
    return message.channel.send("🔒 تم قفل الروم.");
  }

  if (action === "unlock" && isAdmin(message.member)) {
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: null
    });
    return message.channel.send("🔓 تم فتح الروم.");
  }

  if (action === "log" && isAdmin(message.member)) {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("حدد روم اللوقات.");
    s.logChannel = channel.id;
    return message.reply("تم تحديد روم اللوقات.");
  }

  if (action === "logs" && isAdmin(message.member)) {
    s.logs = args[0] === "on";
    return message.reply(s.logs ? "تم تشغيل اللوقات." : "تم إيقاف اللوقات.");
  }

  if (action === "ticketcategory" && isAdmin(message.member)) {
    s.ticketCategory = args[0];
    return message.reply("تم تحديد كاتقوري التذاكر.");
  }

  if (action === "supportrole" && isAdmin(message.member)) {
    s.supportRole = args[0];
    return message.reply("تم تحديد رتبة الدعم.");
  }

  if (action === "ticket" && isAdmin(message.member)) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("dro_ticket_open")
        .setLabel("فتح تذكرة")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
    );
    return message.channel.send({
      embeds: [embed("🎫 الدعم الفني", "اضغط الزر بالأسفل لفتح تذكرة مع فريق الدعم.")],
      components: [row]
    });
  }

  if (action === "applychannel" && isAdmin(message.member)) {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("حدد روم التقديم.");
    s.applicationChannel = channel.id;
    return message.reply("تم تحديد روم التقديم.");
  }

  if (action === "addquestion" && isAdmin(message.member)) {
    const question = args.join(" ");
    if (!question) return message.reply("اكتب السؤال.");
    s.questions.push(question);
    return message.reply("تمت إضافة السؤال.");
  }

  if (action === "reviewrole" && isAdmin(message.member)) {
    s.applicationReview = args[0];
    return message.reply("تم تحديد رتبة مراجعة التقديم.");
  }

  if (action === "acceptrole" && isAdmin(message.member)) {
    s.acceptedRole = args[0];
    return message.reply("تم تحديد رتبة القبول.");
  }

  if (action === "apply" && s.applicationChannel) {
    const channel = message.guild.channels.cache.get(s.applicationChannel);
    if (!channel || !s.questions.length) {
      return message.reply("نظام التقديم غير مكتمل.");
    }
    const content = s.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    await channel.send({
      embeds: [embed("📝 طلب تقديم جديد", `المتقدم: ${message.author}\n\n${content}`)]
    });
    return message.reply("تم إرسال طلب التقديم للمراجعة.");
  }

  if (action === "addlaw" && isAdmin(message.member)) {
    const law = args.join(" ");
    if (!law) return message.reply("اكتب القانون.");
    if (!laws.has(message.guild.id)) laws.set(message.guild.id, []);
    laws.get(message.guild.id).push(law);
    return message.reply("تمت إضافة القانون.");
  }

  if (action === "lawchannel" && isAdmin(message.member)) {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("حدد روم القوانين.");
    s.lawChannel = channel.id;
    return message.reply("تم تحديد روم القوانين.");
  }

  if (action === "publishlaws" && isAdmin(message.member)) {
    const channel = message.guild.channels.cache.get(s.lawChannel);
    const list = laws.get(message.guild.id) || [];
    if (!channel || !list.length) return message.reply("حدد روم القوانين وأضف القوانين أولاً.");
    await channel.send({ embeds: [embed("📜 قوانين السيرفر", list.map((x, i) => `${i + 1}. ${x}`).join("\n"))] });
    return message.reply("تم نشر القوانين.");
  }

  if (action === "shortcut" && isAdmin(message.member)) {
    const name = args[0]?.toLowerCase();
    const cmd = args[1]?.toLowerCase();
    if (!name || !cmd) return message.reply("مثال: !shortcut اذلف kick");
    if (!["kick", "ban", "timeout", "clear", "lock", "unlock"].includes(cmd)) {
      return message.reply("هذا الأمر غير مدعوم كاختصار.");
    }
    shortcuts.set(message.guild.id + ":" + name, cmd);
    return message.reply(`تم إنشاء الاختصار ${name} للأمر ${cmd}.`);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton() || !interaction.guild) return;

  const s = getSettings(interaction.guild.id);

  if (interaction.customId === "dro_ticket_open") {
    const existing = tickets.get(interaction.guild.id + ":" + interaction.user.id);
    if (existing) {
      return interaction.reply({ content: "لديك تذكرة مفتوحة بالفعل.", ephemeral: true });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      parent: s.ticketCategory || undefined,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...(s.supportRole ? [{ id: s.supportRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }] : [])
      ]
    });

    tickets.set(interaction.guild.id + ":" + interaction.user.id, channel.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("dro_ticket_close").setLabel("إغلاق التذكرة").setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${interaction.user} أهلاً بك في الدعم الفني.`,
      components: [row]
    });

    return interaction.reply({ content: `تم فتح تذكرتك: ${channel}`, ephemeral: true });
  }

  if (interaction.customId === "dro_ticket_close") {
    if (!isAdmin(interaction.member) &&
        !(s.supportRole && interaction.member.roles.cache.has(s.supportRole))) {
      return interaction.reply({ content: "ليس لديك صلاحية إغلاق التذكرة.", ephemeral: true });
    }
    tickets.forEach((channelId, key) => {
      if (channelId === interaction.channel.id) tickets.delete(key);
    });
    await interaction.reply("سيتم إغلاق التذكرة.");
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  }
});

client.on(Events.ChannelCreate, channel => {
  if (channel.guild) log(channel.guild, `تم إنشاء روم: ${channel.name}`);
});

client.on(Events.ChannelDelete, channel => {
  if (channel.guild) log(channel.guild, `تم حذف روم: ${channel.name}`);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const guild = newState.guild;
  if (!guild) return;
  const member = newState.member || oldState.member;
  if (!member) return;

  if (!oldState.channelId && newState.channelId) {
    log(guild, `${member.user.tag} دخل الصوتية ${newState.channel.name}`);
  } else if (oldState.channelId && !newState.channelId) {
    log(guild, `${member.user.tag} خرج من الصوتية ${oldState.channel.name}`);
  } else if (oldState.channelId !== newState.channelId) {
    log(guild, `${member.user.tag} انتقل من ${oldState.channel.name} إلى ${newState.channel.name}`);
  }
});
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await handleInteraction(interaction);
});
client.login(TOKEN);
