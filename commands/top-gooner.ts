import AuroraBetaStyler from '@aurora/styler';

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

const topGoonerCommand: ShadowBot.Command = {
  config: {
    name: "top-gooner",
    description: "Show top users of /cosplay and /cosplayv2.",
    usage: "top-gooner",
    aliases: ["topgoon"],
    category: "Leaderboard 🏆"
  },
  run: async ({ api, event, db }) => {
    const { threadID, messageID } = event;
    const styledMessage = (header: string, body: string, symbol: string) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel"
    });
    let sentMessageID: string;
    await new Promise(resolve => {
      api.sendMessage(styledMessage("Top Gooners", "You want to show all gooners? Reply 'Yes' or 'No'.", "🏆"), threadID, (err: any, info: any) => {
        sentMessageID = info?.messageID;
        resolve(info);
      }, messageID);
    });
    if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
    global.Kagenou.replyListeners.set(sentMessageID, {
      callback: async ({ api, event }) => {
        const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
        if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
        const goonerStats = db ? db.db("gooner_stats") : null;
        const topGooners = goonerStats ? await goonerStats.find().sort({ count: -1 }).toArray() : [];
        const limit = body.toLowerCase() === "yes" ? topGooners.length : 5;
        const leaderboard = topGooners.length ? topGooners.slice(0, limit).map((g, i) => `${i + 1}. ${g.username}: ${g.count} goons`).join("\n") : "No gooners yet!";
        await api.sendMessage(styledMessage("Top Gooners", leaderboard, "🏆"), threadID, replyMessageID);
        global.Kagenou.replyListeners.delete(sentMessageID);
      }
    });
  }
};

export default topGoonerCommand;
