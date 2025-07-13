import AuroraBetaStyler from '@aurora/styler';
import axios from "axios";
import { Stream } from "stream";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
      role?: number;
    };
    run: (context: { api: any; event: any; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

const cosplayv2Command: ShadowBot.Command = {
  config: {
    name: "cosplayv2",
    description: "Stream a cosplay video after confirmation.",
    usage: "/cosplayv2",
    aliases: ["goon2"],
    category: "Media 📺",
    role: 2,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    const styledMessage = (header: string, body: string, symbol: string) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel"
    });
      
      const goonerStats = db ? db.db("gooner_stats") : null;
if (goonerStats) {
  let username = `Player${senderID}`;
  try {
    const userInfo = await api.getUserInfo([senderID]);
    username = userInfo[senderID]?.name || username;
  } catch (error) {
  }
  goonerStats.updateOne(
    { userID: senderID },
    { $inc: { count: 1 }, $set: { username } },
    { upsert: true }
  );
}
      
    let sentMessageID: string;
    await new Promise(resolve => {
      api.sendMessage(styledMessage("CosplayV2", "Do you want to goon? Reply with 'Yes' or 'No'.", "🎥"), threadID, (err: any, info: any) => {
        sentMessageID = info?.messageID;
        resolve(info);
      }, messageID);
    });
    if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
    global.Kagenou.replyListeners.set(sentMessageID, {
      callback: async ({ api, event }) => {
        const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply, senderID: replySenderID } = event;
        if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID || replySenderID !== senderID) return;
        if (body.toLowerCase() === "no") {
          await api.sendMessage(styledMessage("CosplayV2", "Cancelled.", "❌"), threadID, replyMessageID);
          global.Kagenou.replyListeners.delete(sentMessageID);
          return;
        }
        if (body.toLowerCase() === "yes") {
          await Promise.resolve();
          try {
            const response = await axios.get("https://haji-mix.up.railway.app/api/cosplayv2?api_key=36c1848682f5d6fe61badc035758da583126d83824f73805f807e268c5444b2f", { responseType: "stream" });
            console.log("API Response Headers:", response.headers);
            if (!(response.data instanceof Stream)) throw new Error("Response is not a stream");
            await api.sendMessage({ body: styledMessage("CosplayV2", "Here's your cosplay video!", "🎥"), attachment: response.data }, threadID, replyMessageID);
          } catch (error) {
            console.log("API Error:", error.message);
            await api.sendMessage(styledMessage("CosplayV2", `Failed to stream video: ${error.message}. Try again later.`, "⚠️"), threadID, replyMessageID);
          }
          global.Kagenou.replyListeners.delete(sentMessageID);
          return;
        }
      }
    });
  }
};

export default cosplayv2Command;
