const fs = require("fs-extra");
const path = require("path");
module.exports = {
  name: "out",
  author: "Aljur Pogoy && Moderators",
  version: "3.0.0",
  description: "Make the bot leave the current thread (Admin only). Usage: #out",
  category: "admin",
  async run({ api, event, args, admins }) {
    const { threadID, messageID, senderID } = event;
    if (!admins.includes(senderID)) {
      return api.sendMessage(
        "════『 𝗢𝗨𝗧 』════\n\n❌ Only Raniel hiyan can use this command.",
        threadID,
        messageID
      );
    }
    const goodbyeMessage = `════『 𝗢𝗨𝗧 』════\n\n` +
      `🌐 Bot is leaving this thread...\n\n` +
      `📋 Goodbye! Feel free to invite me back if needed.\n\n` +
      `> Thank you for using our Cid Kagenou bot`;
    try {
      await api.sendMessage(goodbyeMessage, threadID);
      await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
      console.log(`Bot has left thread ${threadID}`);
    } catch (error) {
      console.error("❌ Error in out command:", error.message);
      const errorMessage = `════『 𝗢𝗨𝗧 』════\n\n` +
        `  ┏━━━━━━━┓\n` +
        `  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while leaving the thread.\n` +
        `  ┃ Error: ${error.message}\n` +
        `  ┗━━━━━━━┛\n\n` +
        `> Thank you for using our Cid Kagenou bot`;
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};