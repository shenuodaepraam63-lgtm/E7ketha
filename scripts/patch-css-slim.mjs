import fs from "node:fs";
const f = "client/src/index.css";
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, "utf8");
if (s.includes('@import "tw-animate-css"')) {
  s = s.replace('@import "tw-animate-css";\n', "");
  fs.writeFileSync(f, s);
  console.log("[patch-css-slim] removed tw-animate-css");
} else {
  console.log("[patch-css-slim] already slim");
}
