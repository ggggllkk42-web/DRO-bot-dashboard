
const { SlashCommandBuilder } = require("discord.js");

const commandList = [
  // التذاكر
  ["ticket", "إنشاء لوحة التذاكر وإعدادها"],
  ["ticket-setup", "إعداد نظام التذاكر"],
  ["ticket-panel", "نشر لوحة التذاكر"],
  ["ticket-close", "إغلاق التذكرة"],
  ["ticket-open", "إعادة فتح التذكرة"],
  ["ticket-claim", "استلام التذكرة"],
  ["ticket-delete", "حذف التذكرة"],
  ["ticket-add", "إضافة عضو للتذكرة"],
  ["ticket-remove", "إزالة عضو من التذكرة"],
  ["ticket-settings", "تعديل إعدادات التذاكر"],

  // التقديم
  ["apply", "إعداد نظام التقديم"],
  ["apply-panel", "نشر لوحة التقديم"],
  ["apply-question", "إضافة سؤال للتقديم"],
  ["apply-edit", "تعديل سؤال"],
  ["apply-delete", "حذف سؤال"],
  ["apply-order", "ترتيب الأسئلة"],
  ["apply-type", "تحديد نوع الإجابة"],
  ["apply-review", "إعداد رتبة المراجعة"],
  ["apply-accept", "قبول طلب التقديم"],
  ["apply-reject", "رفض طلب التقديم"],
  ["apply-settings", "تعديل إعدادات التقديم"],

  // القوانين
  ["laws", "إعداد نظام القوانين"],
  ["law-add", "إضافة قانون"],
  ["law-edit", "تعديل قانون"],
  ["law-delete", "حذف قانون"],
  ["law-publish", "نشر القوانين"],
  ["law-settings", "إعدادات القوانين"],

  // اللوقات
  ["logs", "إعداد نظام اللوقات"],
  ["logs-setup", "إنشاء إعدادات اللوقات"],
  ["logs-channel", "تحديد روم اللوقات"],
  ["logs-category", "تحديد كاتقوري اللوقات"],
  ["logs-edit", "تعديل إعدادات اللوقات"],
  ["logs-delete", "حذف إعدادات اللوقات"],

  // الحماية
  ["protection", "لوحة التحكم بالحماية"],
  ["anti-spam", "منع التكرار والإزعاج"],
  ["anti-link", "منع الروابط"],
  ["anti-raid", "منع الهجمات الجماعية"],
  ["anti-mention", "منع المنشن المزعج"],
  ["anti-bot", "التحكم في دخول البوتات"],
  ["protection-status", "عرض حالة الحماية"],

  // الرسائل الخاصة
  ["dm", "إعداد الرسائل الخاصة"],
  ["dm-role", "تحديد الرتبة المستهدفة"],
  ["dm-title", "تحديد عنوان الرسالة"],
  ["dm-message", "تحديد محتوى الرسالة"],
  ["dm-send", "إرسال رسالة لأعضاء الرتبة"],

  // الإدارة
  ["kick", "طرد عضو"],
  ["ban", "حظر عضو"],
  ["unban", "فك حظر عضو"],
  ["timeout", "إسكات عضو"],
  ["untimeout", "فك إسكات عضو"],
  ["warn", "تحذير عضو"],
  ["warnings", "عرض تحذيرات عضو"],
  ["clear", "مسح الرسائل"],
  ["role-add", "إعطاء رتبة"],
  ["role-remove", "إزالة رتبة"],
  ["nickname", "تغيير لقب عضو"],
  ["lock", "قفل روم"],
  ["unlock", "فتح روم"],
  ["channel-create", "إنشاء روم"],
  ["channel-delete", "حذف روم"],
  ["pin", "تثبيت رسالة"],
  ["unpin", "إلغاء تثبيت رسالة"],

  // الاختصارات
  ["shortcut-add", "إضافة اختصار جديد"],
  ["shortcut-edit", "تعديل اختصار"],
  ["shortcut-delete", "حذف اختصار"],
  ["shortcut-list", "عرض الاختصارات"],
  ["shortcut-permission", "تحديد صلاحية الاختصار"],
  ["shortcut-channel", "تحديد الرومات المسموح بها"],

  // أوامر عامة
  ["help", "عرض قائمة أوامر البوت"],
  ["setup", "إعداد البوت"],
  ["settings", "إعدادات البوت"],
  ["server-info", "معلومات السيرفر"],
  ["user-info", "معلومات عضو"],
  ["bot-info", "معلومات البوت"]
];

const commands = commandList.map(([name, description]) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
);

module.exports = commands;
