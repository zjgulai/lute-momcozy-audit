import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(fs.readFileSync("config/public-data.schema.json", "utf8"));
const data = JSON.parse(fs.readFileSync("src/_data/audit.json", "utf8"));
const validate = new Ajv2020({strict: false}).compile(schema);
if (!validate(data)) {
  console.error(validate.errors);
  process.exit(1);
}
console.log("public data matches the field allowlist");
