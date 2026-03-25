import { Database } from "bun:sqlite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "dev.db"));

const app = db.query("SELECT * FROM App WHERE code = '去水印'").get();
console.log(JSON.stringify(app, null, 2));

db.close();