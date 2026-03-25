const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("./dev.db");
const hash = bcrypt.hashSync("admin123", 10);
const opsHash = bcrypt.hashSync("ops123", 10);
const designHash = bcrypt.hashSync("design123", 10);

db.prepare("UPDATE User SET passwordHash = ? WHERE username = 'admin'").run(hash);
db.prepare("UPDATE User SET passwordHash = ? WHERE username = 'ops.a'").run(opsHash);
db.prepare("UPDATE User SET passwordHash = ? WHERE username = 'design.c'").run(designHash);

console.log("Passwords fixed successfully for all 3 users.");
