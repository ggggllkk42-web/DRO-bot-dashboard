
const {
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

const commands = [];

function add(name, description, setup) {
  const command = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description);

  if (setup) setup(command);
  commands.push(command);
}

const user = (c, required = true) =>
  c.addUserOption(o => o.setName("member").setDescription("اختر العضو").setRequired(required));

const reason = c =>
  c.addStringOption(o => o.setName("reason").setDescription("سبب الإجراء").setRequired(false));

const channel = (c, name = "channel") =>
  c.addChannelOption(o => o.setName(name).setDescription("اختر الروم").setRequired(false));

const role = (c, name = "role") =>
  c.addRoleOption(o => o.setName(name).setDescription("اختر الرتبة").setRequired(false));

const text = (c, name, description) =>
  c.addStringOption(o => o.setName(name).setDescription(description).setRequired(true));

const number = (c, name, description, min = 1, max = 100) =>
  c.addIntegerOption(o => o.setName(name).setDescription(description).setMinValue(min).setMaxValue(max).setRequired(true));

// التذاكر
add("ticket", "إعداد نظام التذاكر", c => {
  channel(c);
  text(c, "title", "عنوان لوحة التذاكر");
  text(c, "description", "وصف لوحة التذاكر");
  role(c, "support");
});

add("ticket-setup", "إعداد أقسام التذاكر", c => {
  channel(c);
  role(c, "support");
});

add("ticket-panel", "نشر لوحة التذاكر", c => channel(c));
add("ticket-close", "إغلاق التذكرة");
add("ticket-open", "إعادة فتح التذكرة");
add("ticket-claim", "استلام التذكرة");
add("ticket-delete", "حذف التذكرة");
add("ticket-add", "إضافة عضو للتذكرة", c => user(c));
add("ticket-remove", "إزالة عضو من التذكرة", c => user(c));
add("ticket-settings", "تعديل إعدادات التذاكر", c => {
  channel(c);
  role(c, "support");
});

// التقديم
add("apply", "إعداد نظام التقديم");
add("apply-panel", "نشر لوحة التقديم", c => channel(c));
add("apply-question", "إضافة سؤال للتقديم", c => {
  text(c, "question", "اكتب السؤال");
  c.addStringOption(o => o.setName("type").setDescription("نوع الإجابة")
    .setRequired(true)
    .addChoices(
      { name: "نص", value: "text" },
      { name: "نعم أو لا", value: "yesno" }
    ));
});
add("apply-edit", "تعديل سؤال", c => {
  number(c, "number", "رقم السؤال");
  text(c, "question", "السؤال الجديد");
});
add("apply-delete", "حذف سؤال", c => number(c, "number", "رقم السؤال"));
add("apply-order", "ترتيب الأسئلة", c => {
  number(c, "number", "رقم السؤال");
  number(c, "order", "الترتيب الجديد");
});
add("apply-type", "تحديد نوع الإجابة", c => {
  number(c, "number", "رقم السؤال");
  text(c, "type", "نوع الإجابة");
});
add("apply-review", "إعداد رتبة المراجعة", c => role(c));
add("apply-accept", "قبول طلب التقديم", c => {
  user(c);
  role(c);
});
add("apply-reject", "رفض طلب التقديم", c => {
  user(c);
  reason(c);
});
add("apply-settings", "تعديل إعدادات التقديم", c => {
  channel(c, "channel");
  channel(c, "review-channel");
  role(c, "review-role");
  role(c, "accepted-role");
});

// القوانين
add("laws", "نشر القوانين");
add("law-add", "إضافة قانون", c => text(c, "law", "نص القانون"));
add("law-edit", "تعديل قانون", c => {
  number(c, "number", "رقم القانون");
  text(c, "law", "النص الجديد");
});
add("law-delete", "حذف قانون", c => number(c, "number", "رقم القانون"));
add("law-publish", "نشر القوانين", c => channel(c));
add("law-settings", "إعدادات القوانين", c => {
  channel(c);
  text(c, "title", "عنوان القوانين");
  role(c, "role");
});

// اللوقات
add("logs", "إعداد نظام اللوقات", c => channel(c));
add("logs-setup", "إنشاء إعدادات اللوقات", c => channel(c));
add("logs-channel", "تحديد روم اللوقات", c => channel(c));
add("logs-category", "تحديد كاتقوري اللوقات", c => {
  c.addChannelOption(o => o.setName("category")
    .setDescription("اختر الكاتقوري")
    .addChannelTypes(ChannelType.GuildCategory)
    .setRequired(true));
});
add("logs-edit", "تعديل إعدادات اللوقات", c => channel(c));
add("logs-delete", "حذف إعدادات اللوقات");

// الحماية
add("protection", "لوحة التحكم بالحماية");
add("anti-spam", "التحكم بمنع التكرار");
add("anti-link", "التحكم بمنع الروابط");
add("anti-raid", "التحكم بمنع الهجمات الجماعية");
add("anti-mention", "التحكم بمنع المنشن المزعج");
add("anti-bot", "التحكم في دخول البوتات");
add("protection-status", "عرض حالة الحماية");

// الرسائل الخاصة
add("dm", "إعداد الرسائل الخاصة");
add("dm-role", "تحديد الرتبة المستهدفة", c => role(c));
add("dm-title", "تحديد عنوان الرسالة", c => text(c, "title", "العنوان"));
add("dm-message", "تحديد محتوى الرسالة", c => text(c, "message", "محتوى الرسالة"));
add("dm-send", "إرسال رسالة لأعضاء الرتبة", c => role(c));

// الإدارة
add("kick", "طرد عضو", c => { user(c); reason(c); });
add("ban", "حظر عضو", c => { user(c); reason(c); });
add("unban", "فك حظر عضو", c => text(c, "userid", "معرف العضو"));
add("timeout", "إسكات عضو", c => {
  user(c);
  number(c, "minutes", "مدة الإسكات بالدقائق", 1, 40320);
  reason(c);
});
add("untimeout", "فك إسكات عضو", c => user(c));
add("warn", "تحذير عضو", c => { user(c); reason(c); });
add("warnings", "عرض تحذيرات عضو", c => user(c));
add("clear", "مسح الرسائل", c => number(c, "amount", "عدد الرسائل", 1, 100));
add("role-add", "إعطاء رتبة لعضو", c => { user(c); role(c); });
add("role-remove", "إزالة رتبة من عضو", c => { user(c); role(c); });
add("nickname", "تغيير لقب عضو", c => {
  user(c);
  text(c, "nickname", "اللقب الجديد");
});
add("lock", "قفل الروم");
add("unlock", "فتح الروم");
add("channel-create", "إنشاء روم", c => text(c, "name", "اسم الروم"));
add("channel-delete", "حذف الروم", c => channel(c));
add("pin", "تثبيت رسالة", c => text(c, "message-id", "معرف الرسالة"));
add("unpin", "إلغاء تثبيت رسالة", c => text(c, "message-id", "معرف الرسالة"));

// الاختصارات
add("shortcut-add", "إضافة اختصار جديد", c => {
  text(c, "shortcut", "كلمة الاختصار");
  text(c, "action", "اسم الوظيفة مثل kick أو ban");
});
add("shortcut-edit", "تعديل اختصار", c => {
  text(c, "shortcut", "الاختصار");
  text(c, "action", "الوظيفة الجديدة");
});
add("shortcut-delete", "حذف اختصار", c => text(c, "shortcut", "الاختصار"));
add("shortcut-list", "عرض الاختصارات");
add("shortcut-permission", "تحديد صلاحية الاختصار", c => {
  text(c, "shortcut", "الاختصار");
  text(c, "permission", "الصلاحية المطلوبة");
});
add("shortcut-channel", "تحديد الرومات المسموح بها", c => {
  text(c, "shortcut", "الاختصار");
  channel(c);
});

// أوامر عامة
add("help", "عرض قائمة أوامر البوت");
add("setup", "إعداد البوت");
add("settings", "إعدادات البوت");
add("server-info", "معلومات السيرفر");
add("user-info", "معلومات عضو", c => user(c, false));
add("bot-info", "معلومات البوت");

module.exports = commands;
