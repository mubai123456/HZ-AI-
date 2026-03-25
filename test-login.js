const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("./dev.db");
const user = db.prepare("SELECT * FROM User WHERE username = 'admin'").get();
console.log("Found user:", user.username);
console.log("Hash:", user.passwordHash);

const isValid = bcrypt.compareSync("admin123", user.passwordHash);
console.log("Is admin123 valid?", isValid);
