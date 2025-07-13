const path = require("path");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugin", "aurora-beta-styler"));
module.exports = {
  config: {
    name: "thread",
    description: "Manage threads with ban, approve, pending, list, and unban actions.",
    usage: "thread <ban/approve/pending/list/unban> [threadID]",
    role: 3,
  },
  run: async ({ api, event, args, db, admins }) => {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const targetThreadID = args[1]?.trim();
    if (!admins.includes(senderID.toString())) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Access Denied",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Only developers can manage threads.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(errorMessage, threadID, messageID);
      return;
    }
    if (!db) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Database not initialized. Ensure MongoDB is connected and try again.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(errorMessage, threadID, messageID);
      return;
    }
    const bannedThreadsCollection = db.db("bannedThreads");
    if (action === "ban" && targetThreadID) {
      if (!/^\d+$/.test(targetThreadID)) {
        const invalidMessage = AuroraBetaStyler.styleOutput({
          headerText: "Error",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Invalid thread ID. Please provide a valid numeric threadID.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(invalidMessage, threadID, messageID);
        return;
      }
      const existingBan = await bannedThreadsCollection.findOne({ threadID: targetThreadID });
      if (existingBan) {
        const alreadyBannedMessage = AuroraBetaStyler.styleOutput({
          headerText: "Notice",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Thread ${targetThreadID} is already banned.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(alreadyBannedMessage, threadID, messageID);
        return;
      }
      await bannedThreadsCollection.insertOne({ threadID: targetThreadID, bannedAt: new Date() });
      const banMessage = AuroraBetaStyler.styleOutput({
        headerText: "Thread Ban",
        headerSymbol: "🔒",
        headerStyle: "bold",
        bodyText: `Thread ${targetThreadID} has been banned. The bot will no longer respond there.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(banMessage, threadID, messageID);
      return;
    }
    if (action === "approve" && targetThreadID) {
      if (!/^\d+$/.test(targetThreadID)) {
        const invalidMessage = AuroraBetaStyler.styleOutput({
          headerText: "Error",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Invalid thread ID. Please provide a valid numeric threadID.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(invalidMessage, threadID, messageID);
        return;
      }
      const existingBan = await bannedThreadsCollection.findOne({ threadID: targetThreadID });
      if (existingBan) {
        await bannedThreadsCollection.deleteOne({ threadID: targetThreadID });
        const approveMessage = AuroraBetaStyler.styleOutput({
          headerText: "Thread Approval",
          headerSymbol: "✅",
          headerStyle: "bold",
          bodyText: `Thread ${targetThreadID} has been approved.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(approveMessage, threadID, messageID);
        return;
      }
      const alreadyApprovedMessage = AuroraBetaStyler.styleOutput({
        headerText: "Notice",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Thread ${targetThreadID} is already approved.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(alreadyApprovedMessage, threadID, messageID);
      return;
    }
    if (action === "pending") {
      const pendingThreads = await bannedThreadsCollection.find().toArray();
      if (pendingThreads.length === 0) {
        const noPendingMessage = AuroraBetaStyler.styleOutput({
          headerText: "Pending Threads",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: "No pending threads found.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(noPendingMessage, threadID, messageID);
        return;
      }
      const bodyText = [
        "Pending Threads:",
        ...pendingThreads.map(thread => `  - ${thread.threadID} (Banned at: ${thread.bannedAt})`)
      ].join("\n");
      const pendingMessage = AuroraBetaStyler.styleOutput({
        headerText: "Pending Threads",
        headerSymbol: "⏳",
        headerStyle: "bold",
        bodyText,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(pendingMessage, threadID, messageID);
      return;
    }
    if (action === "list") {
      const threadList = await api.getThreadList(100, null, ["INBOX"]);
      const threads = threadList.filter(thread => thread.isGroup && thread.name !== thread.threadID && thread.threadID !== event.threadID);
      const bannedThreads = await bannedThreadsCollection.find().toArray();
      if (threads.length === 0 && bannedThreads.length === 0) {
        const noThreadsMessage = AuroraBetaStyler.styleOutput({
          headerText: "Thread List",
          headerSymbol: "📋",
          headerStyle: "bold",
          bodyText: "No active or banned group threads found.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(noThreadsMessage, threadID, messageID);
        return;
      }
      const bodyText = [
        "Active Threads:",
        ...threads.map(thread => `  - ${thread.name || thread.threadID} (ID: ${thread.threadID})`),
        bannedThreads.length > 0 ? "\nBanned Threads:" : "",
        ...bannedThreads.map(thread => `  - ${thread.threadID} (Banned at: ${thread.bannedAt})`)
      ].join("\n");
      const listMessage = AuroraBetaStyler.styleOutput({
        headerText: "Thread List",
        headerSymbol: "📋",
        headerStyle: "bold",
        bodyText,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(listMessage, threadID, messageID);
      return;
    }
    if (action === "unban" && targetThreadID) {
      if (!/^\d+$/.test(targetThreadID)) {
        const invalidMessage = AuroraBetaStyler.styleOutput({
          headerText: "Error",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Invalid thread ID. Please provide a valid numeric threadID.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(invalidMessage, threadID, messageID);
        return;
      }
      const existingBan = await bannedThreadsCollection.findOne({ threadID: targetThreadID });
      if (!existingBan) {
        const notBannedMessage = AuroraBetaStyler.styleOutput({
          headerText: "Notice",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Thread ${targetThreadID} is not banned.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel"
        });
        await api.sendMessage(notBannedMessage, threadID, messageID);
        return;
      }
      await bannedThreadsCollection.deleteOne({ threadID: targetThreadID });
      const unbanMessage = AuroraBetaStyler.styleOutput({
        headerText: "Thread Unban",
        headerSymbol: "🔓",
        headerStyle: "bold",
        bodyText: `Thread ${targetThreadID} has been unbanned. The bot will now respond there.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel"
      });
      await api.sendMessage(unbanMessage, threadID, messageID);
      return;
    }
    const usageMessage = AuroraBetaStyler.styleOutput({
      headerText: "Thread Management",
      headerSymbol: "📌",
      headerStyle: "bold",
      bodyText: "Usage:\n• /thread ban <threadID>\n• /thread approve <threadID>\n• /thread pending\n• /thread list\n• /thread unban <threadID>",
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel"
    });
    await api.sendMessage(usageMessage, threadID, messageID);
  },
  preventBannedResponse: function (api, event, next) {
    const { threadID } = event;
    if (global.db) {
      const bannedThreadsCollection = global.db.db("bannedThreads");
      bannedThreadsCollection.findOne({ threadID: threadID.toString() }, (err, result) => {
        if (err) {
          console.error("DB error in preventBannedResponse:", err);
          next();
        } else if (result) {
          return;
        } else {
          next();
        }
      });
    } else {
      next();
    }
  }
};
