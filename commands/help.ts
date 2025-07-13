const AuroraBetaStyler = require("@aurora/styler");
const { LINE } = AuroraBetaStyler;
import * as fs from "fs";
import * as path from "path";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
    };
    run: (context: { api: any; event: any; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

const helpCommand: ShadowBot.Command = {
  config: {
    name: "help",
    description: "Displays all available commands or detailed info about a specific command",
    usage: "help or help <command> or help <page> or help all",
    aliases: [],
    category: "Utility"
  },
  run: async ({ api, event, args, db }) => {
    const { threadID, messageID } = event;
    const commandsDir = path.join(__dirname, "..", "commands");
    if (!fs.existsSync(commandsDir)) {
      console.error("❌ Commands directory not found:", commandsDir);
      await new Promise(resolve => {
        api.sendMessage("❌ Error: Commands directory not found.", threadID, (err: any, info: any) => {
          resolve(info);
        }, messageID);
      });
      return;
    }
    let commandList: string[] = [];
    let eventList: string[] = [];
    try {
      const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith(".js") || file.endsWith(".ts"));
      commandFiles.forEach(file => {
        const commandPath = path.join(commandsDir, file);
        try {
          delete require.cache[require.resolve(commandPath)];
          const commandModule = require(commandPath);
          const command = commandModule.default || commandModule;
          const commandName = file.replace(/\.js|\.ts/, "");
          if (typeof command !== "object" || !command.name) {
            return;
          }
          if (command.handleEvent) {
            eventList.push(` ${commandName}`);
          } else {
            commandList.push(`${commandName} (${file.endsWith(".ts") ? "TS" : "JS"})`);
          }
        } catch (cmdError) {
          console.error(`❌ Error loading command: ${file}`, cmdError);
        }
      });
    } catch (error) {
      console.error("❌ Error reading commands directory:", error);
      await new Promise(resolve => {
        api.sendMessage("❌ Error loading command list.", threadID, (err: any, info: any) => {
          resolve(info);
        }, messageID);
      });
      return;
    }
    const styledMessage = (header: string, body: string, symbol: string) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "sansSerif",
      footerText: "Modefied by: Raniel"
    });
    let sentMessageID: string;
    if (args.length > 0 && args[0].toLowerCase() === "all") {
      const allCommands = [...commandList, ...eventList].join("\n");
      await new Promise(resolve => {
        api.sendMessage(styledMessage("All Commands", allCommands || "No commands available.", "🌐"), threadID, (err: any, info: any) => {
          sentMessageID = info?.messageID;
          resolve(info);
        }, messageID);
      });
      return;
    }
    if (args.length > 0 && isNaN(parseInt(args[0]))) {
      const commandName = args[0].toLowerCase();
      const commandPath = path.join(commandsDir, `${commandName}.js`) || path.join(commandsDir, `${commandName}.ts`);
      if (!fs.existsSync(commandPath)) {
        await new Promise(resolve => {
          api.sendMessage(styledMessage("Error", `❌ Command "${commandName}" not found.`, "⚠️"), threadID, (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          }, messageID);
        });
        return;
      }
      try {
        delete require.cache[require.resolve(commandPath)];
        const commandModule = require(commandPath);
        const command = commandModule.default || commandModule;
        if (typeof command !== "object" || !command.name) {
          await new Promise(resolve => {
            api.sendMessage(styledMessage("Error", `❌ Invalid command: ${commandName}`, "⚠️"), threadID, (err: any, info: any) => {
              sentMessageID = info?.messageID;
              resolve(info);
            }, messageID);
          });
          return;
        }
        const bodyText = `
Name: ${command.name || "N/A"}
Category: ${command.config?.category || "N/A"}
Description: ${command.config?.description || "No description available"}
Author: ${command.config?.author || "Cid Kagenou"}
Version: ${command.config?.version || "1.0"}
Usage: ${command.config?.usage || `/${command.name}`}
        `.trim();
        await new Promise(resolve => {
          api.sendMessage(styledMessage("Command Info", bodyText, "ℹ️"), threadID, (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          }, messageID);
        });
        return;
      } catch (error) {
        console.error(`❌ Error loading command: ${commandName}`, error);
        await new Promise(resolve => {
          api.sendMessage(styledMessage("Error", `❌ Error loading command: ${commandName}`, "⚠️"), threadID, (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          }, messageID);
        });
        return;
      }
    }
    const commandsPerPage = 10;
    const totalCommands = commandList.length;
    const totalPages = Math.ceil(totalCommands / commandsPerPage);
    const page = args.length > 0 && !isNaN(parseInt(args[0])) ? parseInt(args[0]) : 1;
    if (page < 1 || page > totalPages) {
      await new Promise(resolve => {
        api.sendMessage(styledMessage("Error", `❌ Invalid page. Choose between 1 and ${totalPages}.`, "⚠️"), threadID, (err: any, info: any) => {
          sentMessageID = info?.messageID;
          resolve(info);
        }, messageID);
      });
      return;
    }
    const startIndex = (page - 1) * commandsPerPage;
    const endIndex = Math.min(startIndex + commandsPerPage, totalCommands);
    const paginatedCommands = commandList.slice(startIndex, endIndex);
    const bodyText = `
📌 𝖢𝗈𝗆𝗆𝖺𝗇𝖽𝗌:
${paginatedCommands.length > 0 ? paginatedCommands.join("\n") : "No commands on this page."}
${LINE}
🌟 𝖤𝗏𝖾𝗇𝗍 𝖢𝗈𝗆𝗆𝖺𝗇𝖽𝗌:
${page === 1 && eventList.length > 0 ? eventList.join("\n") : ""}
${LINE}
📖 𝖯𝖺𝗀𝖾 ${page}/${totalPages}
${totalPages > 1 ? "> 🔄 𝖭𝖾𝗑𝗍 𝗉𝖺𝗀𝖾: /𝗁𝖾𝗅𝗉 " + (page + 1) + "\n" : ""}
 ℹ️ 𝖣𝖾𝗍𝖺𝗂𝗅𝗌: ${config.Prefix}𝗁𝖾𝗅𝗉 <𝖼𝗈𝗆𝗆𝖺𝗇𝖽>
 🌟 𝖠𝗅𝗅 𝖢𝗈𝗆𝗆𝖺𝗇𝖽𝗌: /𝗁𝖾𝗅𝗉 𝖺𝗅𝗅
 🌟 𝖤𝗇𝗃𝗈𝗒 𝖢𝗂𝖽 𝖪𝖺𝗀𝖾𝗇𝗈𝗎 𝖡𝗈𝗍!
    `.trim();
    await new Promise(resolve => {
      api.sendMessage(styledMessage("Help", bodyText, "🌐"), threadID, (err: any, info: any) => {
        sentMessageID = info?.messageID;
        resolve(info);
      }, messageID);
    });
  }
};

export default helpCommand;
