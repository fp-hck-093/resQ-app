const os = require("os");
const fs = require("fs");
const path = require("path");

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "127.0.0.1";
}

function updateEnv(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`^(${key}=).*$`, "m"), `$1"${value}"`);
  }
  fs.writeFileSync(filePath, content, "utf8");
}

const ip = process.argv[2] ?? getLocalIP();
console.log(`Using IP: ${ip}`);

const appEnv = path.join(__dirname, "app", ".env");
const serverEnv = path.join(__dirname, "server", ".env");

updateEnv(appEnv, {
  EXPO_PUBLIC_SERVER_URI: `http://${ip}:3000/graphql`,
});

updateEnv(serverEnv, {
  SERVER_URL: `http://${ip}:3000`,
  FRONTEND_URL: `exp://${ip}:8081/--`,
});

console.log("Updated app/.env and server/.env");
console.log(`  EXPO_PUBLIC_SERVER_URI → http://${ip}:3000/graphql`);
console.log(`  SERVER_URL             → http://${ip}:3000`);
console.log(`  FRONTEND_URL           → exp://${ip}:8081/--`);
