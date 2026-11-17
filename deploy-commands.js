
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
  throw new Error(
    "يرجى ضبط DISCORD_TOKEN و CLIENT_ID و GUILD_ID في إعدادات الاستضافة."
  );
}

const commands = [];

function add(command) {
  commands.push(command.toJSON());
}

function memberOption(command, required = true) {
  return command.addUserOption(option =>
    option.setName("member")
      .setDescription("العضو المطلوب")
      .setRequired(required)
  );
}

function reasonOption(command) {
  return command.addStringOption(option =>
    option.setName("reason")
      .setDescription("سبب الإجراء")
      .setRequired(false)
      .setMaxLength(500)
  );
}

// =========================
// الأوامر الإدارية
// =========================

let command;

command = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("طرد عضو من السيرفر");
memberOption(command);
reasonOption(command);
add(command);

command = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("حظر عضو من السيرفر");
memberOption(command);
reasonOption(command);
add(command);

add(
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("فك الحظر عن عضو")
    .addStringOption(option =>
      option.setName("userid")
        .setDescription("آيدي العضو")
        .setRequired(true)
    )
);

command = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("إسكات عضو لمدة محددة");
memberOption(command);
command.addIntegerOption(option =>
  option.setName("minutes")
    .setDescription("المدة بالدقائق")
    .setMinValue(1)
    .setMaxValue(40320)
    .setRequired(true)
);
reasonOption(command);
add(command);

command = new SlashCommandBuilder()
  .setName("untimeout")
  .setDescription("إزالة الإسكات عن عضو");
memberOption(command);
add(command);

command = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("إعطاء تحذير لعضو");
memberOption(command);
reasonOption(command);
add(command);

command = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("عرض تحذيرات عضو");
memberOption(command);
add(command);

command = new SlashCommandBuilder()
  .setName("clear-warnings")
  .setDescription("مسح جميع تحذيرات عضو");
memberOption(command);
add(command);

add(
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("مسح عدد من الرسائل")
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("عدد الرسائل")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
);

for (const name of ["lock", "unlock", "hide", "unhide"]) {
  add(
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        name === "lock" ? "قفل الروم" :
        name === "unlock" ? "فتح الروم" :
        name === "hide" ? "إخفاء الروم" :
        "إظهار الروم"
      )
  );
}

for (const name of ["role-add", "role-remove"]) {
  add(
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        name === "role-add" ? "إضافة رتبة لعضو" : "إزالة رتبة من عضو"
      )
      .addUserOption(option =>
        option.setName("member")
          .setDescription("العضو")
          .setRequired(true)
      )
      .addRoleOption(option =>
        option.setName("role")
          .setDescription("الرتبة")
          .setRequired(true)
      )
  );
}

add(
  new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("تغيير اسم عضو")
    .addUserOption(option =>
      option.setName("member")
        .setDescription("العضو")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("name")
        .setDescription("الاسم الجديد")
        .setRequired(true)
        .setMaxLength(32)
    )
);

for (const name of ["move", "disconnect", "userinfo"]) {
  add(
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        name === "move" ? "نقل عضو إلى رومك الصوتي" :
        name === "disconnect" ? "إخراج عضو من الروم الصوتي" :
        "عرض معلومات عضو"
      )
      .addUserOption(option =>
        option.setName("member")
          .setDescription("العضو")
          .setRequired(true)
      )
  );
}

add(
  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("عرض معلومات السيرفر")
);

add(
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("عرض قائمة أوامر DRO BOT")
);

// =========================
// نظام التذاكر
// =========================

add(
  new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("إعداد نظام التذاكر")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم لوحة التذاكر")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("رتبة الدعم الفني")
        .setRequired(false)
    )
);

add(
  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("نشر لوحة التذاكر")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("الروم المراد النشر فيه")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
);

add(
  new SlashCommandBuilder()
    .setName("ticket-settings")
    .setDescription("تعديل إعدادات التذاكر")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم أو كاتقوري التذاكر")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildCategory
        )
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("رتبة الدعم الفني")
        .setRequired(false)
    )
);

for (const name of [
  "ticket-claim",
  "ticket-close",
  "ticket-delete"
]) {
  add(
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        name === "ticket-claim" ? "استلام التذكرة" :
        name === "ticket-close" ? "إغلاق التذكرة" :
        "حذف التذكرة"
      )
  );
}

// =========================
// نظام التقديم
// =========================

add(
  new SlashCommandBuilder()
    .setName("apply-setup")
    .setDescription("إعداد نظام التقديم")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم لوحة التقديم")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName("review")
        .setDescription("روم استقبال الطلبات")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("رتبة مراجعة الطلبات")
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName("accepted-role")
        .setDescription("الرتبة التي يحصل عليها المقبول")
        .setRequired(false)
    )
);

add(
  new SlashCommandBuilder()
    .setName("apply-panel")
    .setDescription("نشر لوحة التقديم")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم نشر اللوحة")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
);

add(
  new SlashCommandBuilder()
    .setName("apply-settings")
    .setDescription("عرض إعدادات نظام التقديم")
);

// =========================
// الرسائل الخاصة
// =========================

add(
  new SlashCommandBuilder()
    .setName("dm-all")
    .setDescription("إرسال رسالة خاصة لجميع الأعضاء")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("نص الرسالة")
        .setRequired(true)
        .setMaxLength(2000)
    )
);

add(
  new SlashCommandBuilder()
    .setName("dm-user")
    .setDescription("إرسال رسالة خاصة لعضو")
    .addUserOption(option =>
      option.setName("member")
        .setDescription("العضو")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("نص الرسالة")
        .setRequired(true)
        .setMaxLength(2000)
    )
);

add(
  new SlashCommandBuilder()
    .setName("dm-embed")
    .setDescription("إرسال رسالة Embed خاصة لجميع الأعضاء")
    .addStringOption(option =>
      option.setName("title")
        .setDescription("عنوان الرسالة")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("محتوى الرسالة")
        .setRequired(true)
        .setMaxLength(4000)
    )
);

// =========================
// نظام القوانين
// =========================

add(
  new SlashCommandBuilder()
    .setName("laws-setup")
    .setDescription("إعداد نظام القوانين")
    .addStringOption(option =>
      option.setName("title")
        .setDescription("عنوان القوانين")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم القوانين")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
);

add(
  new SlashCommandBuilder()
    .setName("law-add")
    .setDescription("إضافة قانون جديد")
    .addStringOption(option =>
      option.setName("law")
        .setDescription("نص القانون")
        .setRequired(true)
        .setMaxLength(1000)
    )
);

add(
  new SlashCommandBuilder()
    .setName("laws-edit")
    .setDescription("تعديل قانون موجود")
    .addIntegerOption(option =>
      option.setName("number")
        .setDescription("رقم القانون")
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("law")
        .setDescription("النص الجديد للقانون")
        .setRequired(true)
        .setMaxLength(1000)
    )
);

add(
  new SlashCommandBuilder()
    .setName("laws-publish")
    .setDescription("نشر قوانين السيرفر")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم النشر")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
);

// =========================
// نظام السجلات
// =========================

add(
  new SlashCommandBuilder()
    .setName("logs-setup")
    .setDescription("تفعيل السجلات وتحديد رومها")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم السجلات")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
);

add(
  new SlashCommandBuilder()
    .setName("logs-settings")
    .setDescription("تحديد كاتقوري السجلات")
    .addChannelOption(option =>
      option.setName("category")
        .setDescription("كاتقوري السجلات")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
);

add(
  new SlashCommandBuilder()
    .setName("logs-delete")
    .setDescription("إيقاف نظام السجلات")
);

// =========================
// الترحيب والحماية
// =========================

add(
  new SlashCommandBuilder()
    .setName("welcome-setup")
    .setDescription("إعداد رسالة الترحيب")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("روم الترحيب")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("رسالة الترحيب")
        .setRequired(true)
        .setMaxLength(2000)
    )
);

add(
  new SlashCommandBuilder()
    .setName("protection-setup")
    .setDescription("إعداد أنظمة الحماية")
    .addBooleanOption(option =>
      option.setName("antispam")
        .setDescription("تفعيل مكافحة السبام")
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName("antilinks")
        .setDescription("تفعيل منع الروابط")
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName("antimentions")
        .setDescription("تفعيل منع المنشن الجماعي")
        .setRequired(false)
    )
);

// =========================
// نشر الأوامر
// =========================

async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("جاري تسجيل أوامر DRO BOT...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(`تم تسجيل ${commands.length} أمر بنجاح.`);
  } catch (error) {
    console.error("فشل تسجيل الأوامر:", error);
    throw error;
  }
}

deployCommands();
