
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ guilds: {} }, null, 2),
      "utf8"
    );
  }
}

function loadDatabase() {
  ensureDatabase();

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Database read error:", error);
    return { guilds: {} };
  }
}

function saveDatabase(data) {
  ensureDatabase();

  const tempFile = DATA_FILE + ".tmp";

  fs.writeFileSync(
    tempFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  fs.renameSync(tempFile, DATA_FILE);
}

function getGuild(guildId) {
  const database = loadDatabase();

  if (!database.guilds[guildId]) {
    database.guilds[guildId] = {
      logs: {
        enabled: true,
        channelId: null
      },
      tickets: {
        categoryId: null,
        panelChannelId: null,
        supportRoleId: null,
        welcomeMessage: "أهلاً بك في الدعم الفني.",
        openTickets: {}
      },
      applications: {
        channelId: null,
        reviewChannelId: null,
        reviewRoleId: null,
        acceptedRoleId: null,
        questions: [],
        submissions: {}
      },
      laws: {
        channelId: null,
        title: "قوانين السيرفر",
        description: "",
        memberRoleId: null,
        items: []
      },
      shortcuts: {},
      customDM: {
        roleId: null,
        title: "",
        message: ""
      },
      protection: {
        antiSpam: false,
        antiLinks: false,
        antiMentions: false
      }
    };

    saveDatabase(database);
  }

  return database.guilds[guildId];
}

function updateGuild(guildId, changes) {
  const database = loadDatabase();
  const current = getGuild(guildId);

  database.guilds[guildId] = {
    ...current,
    ...changes
  };

  saveDatabase(database);

  return database.guilds[guildId];
}

module.exports = {
  loadDatabase,
  saveDatabase,
  getGuild,
  updateGuild
};
