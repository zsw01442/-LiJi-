const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const fs = require("fs").promises;
const path = require("path");

process.env.TZ = "Asia/Shanghai";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || "/app/data";
const RECORDS_FILE = path.join(DATA_DIR, "records.json");
const GIFTBOOKS_FILE = path.join(DATA_DIR, "giftbooks.json");
const PASSWORD_FILE = path.join(DATA_DIR, "password.json");
const PACKAGE_FILE = path.join(__dirname, "package.json");

const SESSION_COOKIE = "liji_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "登录尝试过多，请稍后重试" },
});

const Gan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const Zhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const Animals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const lunarMonthName = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
const lunarDayName = [
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
];
const springFestivals = {
  2020: { month: 1, day: 25, ganIdx: 6, zhiIdx: 0 },
  2021: { month: 2, day: 12, ganIdx: 7, zhiIdx: 1 },
  2022: { month: 2, day: 1, ganIdx: 8, zhiIdx: 2 },
  2023: { month: 1, day: 22, ganIdx: 9, zhiIdx: 3 },
  2024: { month: 2, day: 10, ganIdx: 0, zhiIdx: 4 },
  2025: { month: 1, day: 29, ganIdx: 1, zhiIdx: 5 },
  2026: { month: 2, day: 17, ganIdx: 2, zhiIdx: 6 },
};

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getLunarDateString(year, month, day) {
  try {
    const response = await fetchWithTimeout(
      `https://www.mxnzp.com/api/lunar/calendar?year=${year}&month=${month}&day=${day}`,
      5000
    );
    if (!response.ok) {
      throw new Error(`lunar api status ${response.status}`);
    }

    const data = await response.json();
    if (data.code === 1 && data.data) {
      const lunarInfo = data.data;
      const ganZhi = lunarInfo.ganzhi || "";
      const animal = lunarInfo.animal || "";
      const lunarMonth = lunarInfo.lunarMonth || "";
      const lunarDay = lunarInfo.lunarDay || "";
      return `农历${ganZhi}（${animal}）年${lunarMonth}${lunarDay}`;
    }

    throw new Error("lunar api payload invalid");
  } catch (error) {
    const sf = springFestivals[year];
    if (!sf) {
      const cycleYear = (year - 2020) % 60;
      const ganIdx = (cycleYear + 6) % 10;
      const zhiIdx = (cycleYear + 12) % 12;
      return `农历${Gan[ganIdx]}${Zhi[zhiIdx]}（${Animals[zhiIdx]}）年正月`;
    }

    const inputDate = new Date(year, month - 1, day);
    const springDate = new Date(year, sf.month - 1, sf.day);
    const dayDiff = Math.floor((inputDate - springDate) / (24 * 60 * 60 * 1000));
    const lunarYear = dayDiff < 0 ? year - 1 : year;
    const lunarMonth = Math.floor(Math.max(dayDiff, 0) / 29.5) + 1;
    const lunarDay = (Math.max(dayDiff, 0) % 29) + 1;

    const cycleYear = (lunarYear - 2020) % 60;
    const ganIdx = (cycleYear + 6) % 10;
    const zhiIdx = (cycleYear + 12) % 12;
    const monthStr = lunarMonthName[Math.min(lunarMonth - 1, 11)];
    const dayStr = lunarDayName[Math.min(lunarDay - 1, 29)];
    return `农历${Gan[ganIdx]}${Zhi[zhiIdx]}（${Animals[zhiIdx]}）年${monthStr}${dayStr}`;
  }
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function atomicWriteJson(file, data) {
  const tempFile = `${file}.tmp`;
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFile, payload, "utf8");
  await fs.rename(tempFile, file);
}

async function readJson(file, fallback) {
  try {
    const content = await fs.readFile(file, "utf8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPasswordHash(password, encoded) {
  const [salt, expectedHash] = String(encoded || "").split(":");
  if (!salt || !expectedHash) {
    return false;
  }
  const digest = crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
  const lhs = Buffer.from(digest, "hex");
  const rhs = Buffer.from(expectedHash, "hex");
  return lhs.length === rhs.length && crypto.timingSafeEqual(lhs, rhs);
}

function isValidLoginPasswordInput(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 128;
}

function isValidNewPasswordInput(value) {
  return typeof value === "string" && value.length >= 6 && value.length <= 128;
}

async function readPasswordConfig() {
  const payload = await readJson(PASSWORD_FILE, null);
  if (!payload) {
    const initial = {
      passwordHash: hashPassword("admin"),
      isDefault: true,
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(PASSWORD_FILE, initial);
    return initial;
  }

  if (payload.passwordHash) {
    return payload;
  }

  if (payload.password) {
    const migrated = {
      passwordHash: hashPassword(String(payload.password)),
      isDefault: String(payload.password) === "admin",
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(PASSWORD_FILE, migrated);
    return migrated;
  }

  const repaired = {
    passwordHash: hashPassword("admin"),
    isDefault: true,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(PASSWORD_FILE, repaired);
  return repaired;
}

async function updatePassword(newPassword) {
  const nextConfig = {
    passwordHash: hashPassword(newPassword),
    isDefault: false,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(PASSWORD_FILE, nextConfig);
  return nextConfig;
}

function createSession(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, expiresAt);
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  const isHttps = req.secure || forwardedProto === "https";
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    maxAge: SESSION_TTL_MS,
  });
}

function destroySession(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie(SESSION_COOKIE);
}

function isSessionValid(token) {
  if (!token) {
    return false;
  }
  const expiresAt = sessions.get(token);
  if (!expiresAt) {
    return false;
  }
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  if (!isSessionValid(token)) {
    return res.status(401).json({ success: false, message: "未登录或会话已过期" });
  }
  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of sessions.entries()) {
    if (now > expiresAt) {
      sessions.delete(token);
    }
  }
}, 10 * 60 * 1000).unref();

async function initializeDataFiles() {
  await ensureDataDir();
  await readPasswordConfig();
  const records = await readJson(RECORDS_FILE, null);
  const giftbooks = await readJson(GIFTBOOKS_FILE, null);
  if (!Array.isArray(records)) {
    await atomicWriteJson(RECORDS_FILE, []);
  }
  if (!Array.isArray(giftbooks)) {
    await atomicWriteJson(GIFTBOOKS_FILE, []);
  }
}

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.svg"), {
    headers: { "Content-Type": "image/svg+xml" },
  });
});

app.get("/favicon.svg", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.svg"));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/version", async (req, res) => {
  const pkg = await readJson(PACKAGE_FILE, {
    version: "2.0.0",
    name: "liji",
    description: "礼记 - 管理随礼还礼的智能工具",
  });
  res.json({
    version: pkg.version || "2.0.0",
    name: pkg.name || "liji",
    description: pkg.description || "礼记 - 管理随礼还礼的智能工具",
  });
});

app.get("/api/lunar/:year/:month/:day", async (req, res) => {
  const year = Number.parseInt(req.params.year, 10);
  const month = Number.parseInt(req.params.month, 10);
  const day = Number.parseInt(req.params.day, 10);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return res.status(400).json({ error: "invalid date" });
  }
  const lunarDate = await getLunarDateString(year, month, day);
  return res.json({ lunarDate });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ loggedIn: isSessionValid(req.cookies[SESSION_COOKIE]) });
});

app.post("/api/auth/logout", (req, res) => {
  destroySession(req, res);
  res.json({ success: true });
});

app.get("/api/password/status", async (req, res) => {
  try {
    const cfg = await readPasswordConfig();
    res.json({ hasPassword: !!cfg.passwordHash, isFirstTime: !!cfg.isDefault });
  } catch {
    res.status(500).json({ error: "无法获取密码状态" });
  }
});

app.post("/api/password/verify", authLimiter, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!isValidLoginPasswordInput(password)) {
      return res.status(400).json({ success: false, message: "密码格式无效" });
    }

    const cfg = await readPasswordConfig();
    if (!verifyPasswordHash(password, cfg.passwordHash)) {
      return res.status(401).json({ success: false, message: "密码错误" });
    }

    createSession(req, res);
    return res.json({ success: true, message: "验证成功" });
  } catch {
    return res.status(500).json({ success: false, message: "验证失败" });
  }
});

app.post("/api/password", authLimiter, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!isValidNewPasswordInput(newPassword)) {
      return res.status(400).json({ success: false, message: "新密码长度需在 6-128 位" });
    }

    const cfg = await readPasswordConfig();
    if (!isValidLoginPasswordInput(oldPassword) || !verifyPasswordHash(oldPassword, cfg.passwordHash)) {
      return res.status(401).json({ success: false, message: "旧密码错误" });
    }

    await updatePassword(newPassword);
    destroySession(req, res);
    return res.json({ success: true, message: "密码设置成功，请重新登录" });
  } catch {
    return res.status(500).json({ success: false, message: "密码设置失败" });
  }
});

app.get("/api/records", requireAuth, async (req, res) => {
  const records = await readJson(RECORDS_FILE, []);
  if (!Array.isArray(records)) {
    return res.status(500).json({ error: "records data corrupted" });
  }
  return res.json(records);
});

app.post("/api/records", requireAuth, async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: "records must be an array" });
  }
  await atomicWriteJson(RECORDS_FILE, req.body);
  return res.json({ success: true });
});

app.get("/api/giftbooks", requireAuth, async (req, res) => {
  const giftbooks = await readJson(GIFTBOOKS_FILE, []);
  if (!Array.isArray(giftbooks)) {
    return res.status(500).json({ error: "giftbooks data corrupted" });
  }
  return res.json(giftbooks);
});

app.post("/api/giftbooks", requireAuth, async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: "giftbooks must be an array" });
  }
  await atomicWriteJson(GIFTBOOKS_FILE, req.body);
  return res.json({ success: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ success: false, message: "internal server error" });
});

async function start() {
  await initializeDataFiles();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`礼记系统运行在 http://0.0.0.0:${PORT}`);
    console.log(`数据存储目录: ${DATA_DIR}`);
  });
}

start().catch((error) => {
  console.error("启动失败:", error);
  process.exit(1);
});
