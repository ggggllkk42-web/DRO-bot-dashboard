
const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("يرجى ضبط DISCORD_TOKEN و CLIENT_ID و GUILD_ID");
}

const commands = [];

function add(name, description) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description);
}

function userOption(command, name = "member") {
  return command.addUserOption(option =>
    option
      .setName(name)
      .setDescription("حدد العضو")
      .setRequired(true)
  );
}

function reasonOption(command) {
  return command.addStringOption(option =>
    option
      .setName("reason")
      .setDescription("سبب الإجراء")
      .setRequired(false)
  );
}

// =========================
// الأوامر الإدارية
// =========================

commands.push(
  userOption(reasonOption(add("kick", "طرد عضو من السيرفر"))),

  userOption(reasonOption(add("ban", "حظر عضو من السيرفر"))),

  add("unban", "فك الحظر عن عضو")
    .addStringOption(option =>
      option
        .setName("userid")
        .setDescription("آيدي العضو")
        .setRequired(true)
    ),

  userOption(
    reasonOption(
      add("timeout", "إسكات عضو")
        .addIntegerOption(option =>
          option
            .setName("minutes")
            .setDescription("المدة بالدقائق")
            .setMinValue(1)
            .setMaxValue(40320)
            .setRequired(true)
        )
    )
  ),

  userOption(add("untimeout", "إزالة الإسكات عن عضو")),

  userOption(reasonOption(add("warn", "تحذير عضو"))),

  userOption(add("warnings", "عرض تحذيرات عضو")),

  userOption(add("clear-warnings", "مسح تحذيرات عضو")),

  add("clear", "مسح عدد من الرسائل")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("عدد الرسائل")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  add("lock", "قفل الروم الحالي"),
  add("unlock", "فتح الروم الحالي"),
  add("hide", "إخفاء الروم الحالي"),
  add("unhide", "إظهار الروم الحالي"),

  userOption(
    add("role-add", "إعطاء رتبة لعضو")
      .addRoleOption(option =>
        option
          .setName("role")
          .setDescription("الرتبة")
          .setRequired(true)
      )
  ),

  userOption(
    add("role-remove", "إزالة رتبة من عضو")
      .addRoleOption(option =>
        option
          .setName("role")
          .setDescription("الرتبة")
          .setRequired(true)
      )
  ),

  userOption(
    add("nickname", "تغيير اسم عضو")
      .addStringOption(option =>
        option
          .setName("name")
          .setDescription("الاسم الجديد")
          .setRequired(true)
          .setMaxLength(32)
      )
  ),

  userOption(add("move", "نقل عضو إلى رومك الصوتي")),

  userOption(add("disconnect", "إخراج عضو من الصوتية")),

  userOption(add("userinfo", "عرض معلومات عضو")),

  add("serverinfo", "عرض معلومات السيرفر"),

  add("help", "عرض قائمة أوامر البوت")
);

// =========================
// التذاكر والدعم الفني
// =========================

commands.push(
  add("ticket-setup", "إعداد نظام التذاكر")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم لوحة التذاكر")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption(option =>
      option
        .setName("support")
        .setDescription("رتبة الدعم الفني")
    ),

  add("ticket-panel", "نشر لوحة التذاكر")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم نشر اللوحة")
        .addChannelTypes(ChannelType.GuildText)
    ),

  add("ticket-settings", "تعديل إعدادات التذاكر")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم أو كاتقوري التذاكر")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildCategory
        )
    )
    .addRoleOption(option =>
      option
        .setName("support")
        .setDescription("رتبة الدعم الفني")
    ),

  add("ticket-claim", "استلام التذكرة"),

  add("ticket-close", "إغلاق التذكرة"),

  add("ticket-delete", "حذف التذكرة")
);

// =========================
// نظام التقديم
// =========================

commands.push(
  add("apply-setup", "إعداد نظام التقديم")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم نشر لوحة التقديم")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("review")
        .setDescription("روم استقبال الطلبات")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("رتبة مراجعة الطلبات")
    )
    .addRoleOption(option =>
      option
        .setName("accepted-role")
        .setDescription("الرتبة التي يحصل عليها المقبول")
    ),

  add("apply-panel", "نشر لوحة التقديم")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم نشر اللوحة")
        .addChannelTypes(ChannelType.GuildText)
    ),

  add("apply-settings", "تعديل إعدادات التقديم")
);

// =========================
// الرسائل الخاصة
// =========================

commands.push(
  add("dm-all", "إرسال رسالة خاصة للأعضاء")
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("نص الرسالة")
        .setRequired(true)
        .setMaxLength(2000)
    ),

  userOption(
    add("dm-user", "إرسال رسالة خاصة لعضو")
      .addStringOption(option =>
        option
          .setName("message")
          .setDescription("نص الرسالة")
          .setRequired(true)
          .setMaxLength(2000)
      )
  ),

  add("dm-embed", "إرسال رسالة خاصة بتصميم Embed")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("عنوان الرسالة")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("محتوى الرسالة")
        .setRequired(true)
        .setMaxLength(4000)
    )
);

// =========================
// القوانين
// =========================

commands.push(
  add("laws-setup", "إعداد لوحة القوانين")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("عنوان القوانين")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم القوانين")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  add("laws-edit", "تعديل قانون")
    .addIntegerOption(option =>
      option
        .setName("number")
        .setDescription("رقم القانون")
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("law")
        .setDescription("نص القانون الجديد")
        .setRequired(true)
        .setMaxLength(4000)
    ),

  add("laws-publish", "نشر القوانين")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم النشر")
        .addChannelTypes(ChannelType.GuildText)
    )
);

// =========================
// السجلات
// =========================

commands.push(
  add("logs-setup", "إعداد نظام السجلات")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم السجلات")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  add("logs-settings", "تعديل إعدادات السجلات")
    .addChannelOption(option =>
      option
        .setName("category")
        .setDescription("كاتقوري السجلات")
        .addChannelTypes(ChannelType.GuildCategory)
    ),

  add("logs-delete", "إيقاف نظام السجلات")
);

// =========================
// الترحيب والحماية
// =========================

commands.push(
  add("welcome-setup", "إعداد رسالة الترحيب")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("روم الترحيب")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("رسالة الترحيب")
        .setRequired(true)
        .setMaxLength(2000)
    ),

  add("protection-setup", "إعداد أنظمة الحماية")
    .addBooleanOption(option =>
      option
        .setName("antispam")
        .setDescription("الحماية من السبام")
    )
    .addBooleanOption(option =>
      option
        .setName("antilinks")
        .setDescription("الحماية من الروابط")
    )
    .addBooleanOption(option =>
      option
        .setName("antimentions")
        .setDescription("الحماية من المنشنات")
    )
);

// =========================
// تسجيل الأوامر
// =========================

async function deployCommands() {
  try {
    console.log("جاري تسجيل أوامر DRO BOT...");

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      {
        body: commands.map(command => command.toJSON())
      }
    );

    console.log(`تم تسجيل ${commands.length} أمر بنجاح!`);
  } catch (error) {
    console.error("حدث خطأ أثناء تسجيل الأوامر:", error);
    process.exitCode = 1;
  }
}

deployCommands();
