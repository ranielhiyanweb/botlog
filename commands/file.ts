import AuroraBetaStyler from "@aurora/styler"; 
const { LINE } = AuroraBetaStyler;
import * as fs from "fs";
import * as path from "path";

const file: ShadowBot.Command = {
  config: {
    name: "file",
    author: "Aljur pogoy",
    nonPrefix: false,
    description: "Display raw code of a specific .js or .ts file with reaction prompt.",
    usage: "/file <filename> (e.g., /file ai.js or /file ai.ts)",
    category: "Utility",
    role: 3,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID, senderID, body } = event;
    const args = body.split(" ").slice(1);
    const filename = args[0];

    if (!filename || !/\.(js|ts)$/.test(filename)) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Please provide a valid filename (e.g., /file ai.js or /file ai.ts).",
        bodyStyle: "sansSerif",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const filePath = path.join(__dirname,  filename);
    if (!fs.existsSync(filePath)) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `File ${filename} not found.`,
        bodyStyle: "sansSerif",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const rawCode = fs.readFileSync(filePath, "utf8");
    const promptMessage = AuroraBetaStyler.styleOutput({
      headerText: "Raw Code Prompt",
      headerSymbol: "📝",
      headerStyle: "bold",
      bodyText: `Found ${filename}. Would you like to see the raw code? React with 👍 for no or 😢 for yes.`,
      bodyStyle: "sansSerif",
      footerText: "Modefied by: Raniel",
    });

    const info = await new Promise((resolve, reject) => {
      api.sendMessage(promptMessage, threadID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      }, messageID);
    }) as { messageID: string };

    const normalizedMessageID = info.messageID.trim().replace(/\s+/g, '');
    console.log("[DEBUG] Storing reaction data for MessageID:", normalizedMessageID, "with authorID:", senderID);
    global.reactionData.set(normalizedMessageID, {
      messageID: normalizedMessageID,
      threadID,
      authorID: senderID,
      callback: async ({ api, event, reaction }) => {
        if (reaction === "👍") {
          const noMessage = AuroraBetaStyler.styleOutput({
            headerText: "Cancelled",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: `Raw code for ${filename} will not be displayed.`,
            bodyStyle: "sansSerif",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noMessage, threadID, messageID);
        } else if (reaction === "😢") {
          const codeMessage = AuroraBetaStyler.styleOutput({
            headerText: "Raw Code",
            headerSymbol: "💻",
            headerStyle: "bold",
            bodyText: `Raw code for ${filename}:\n\`\`\`${filename.endsWith(".js") ? "javascript" : "typescript"}\n${rawCode}\n\`\`\``,
            bodyStyle: "sansSerif",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(codeMessage, threadID, messageID);
        }
      },
    });
  },
  onReaction: async ({ api, event, reaction }) => {
    const { threadID, messageID, senderID } = event;
    console.log("[DEBUG] onReaction triggered:", reaction, "for MessageID:", messageID);
  },
};

export default file;
