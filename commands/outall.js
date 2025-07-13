const { format, UNIRedux } = require("cassidy-styler");
module.exports = {
  name: "outall",
  author: "Aljur Pogoy",
  version: "4.0.0",
  description: "Makes the bot leave all threads. Usage: #outall (admin only)",
  async run({ api, event, args, db, admins: configAdmins }) {
    const { threadID, messageID, senderID } = event;
    try {
      const admins = configAdmins || [];
      if (!admins.includes(senderID)) {
        const msg = format({
          title: "Out All",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🚪",
          content: `❌ Only Raniel Hiyan can use this command.\n> Thanks for using Cid Kagenou bot`
        });
        return api.sendMessage(msg, threadID, messageID);
      }
      if (!db) {
        const msg = format({
          title: "Out All",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🚪",
          content: `❌ Database not initialized. Ensure MongoDB is connected.\n> Contact bot admin if this persists.\n> Thanks for using Cid Kagenou bot`
        });
        return api.sendMessage(msg, threadID, messageID);
      }
      const threads = await db.db("threads").find({}).toArray();
      if (!threads || threads.length === 0) {
        const msg = format({
          title: "Out All",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🚪",
          content: `❌ No threads found in the database to leave.\n> Thanks for using Cid Kagenou bot`
        });
        return api.sendMessage(msg, threadID, messageID);
      }
      let leftCount = 0;
      const botID = api.getCurrentUserID();
      for (const thread of threads) {
        try {
          await api.removeUserFromGroup(botID, thread.threadID);
          leftCount++;
          console.log(`[OutAll] Left thread ${thread.threadID}: ${thread.name || 'Unnamed Thread'}`);
        } catch (error) {
          console.warn(`[OutAll] Failed to leave thread ${thread.threadID}: ${error.message}`);
        }
      }
      await db.db("threads").deleteMany({});
      console.log(`[OutAll] Cleared all ${threads.length} threads from the database`);
      const content = `🚪 Left ${leftCount} thread(s) successfully.\n> Cleared thread data from the database.\n> Thanks for using Cid Kagenou bot`;
      const msg = format({
        title: "Out All",
        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
        titleFont: "double_struck",
        contentFont: "fancy_italic",
        emojis: "🚪",
        content
      });
      await api.sendMessage(msg, threadID, messageID);
    } catch (error) {
      const errMsg = format({
        title: "Out All",
        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
        titleFont: "double_struck",
        contentFont: "fancy_italic",
        emojis: "🚪",
        content: `┏━━━━━━━┓\n┃ Error: ${error.message}\n┗━━━━━━━┛\n> Thanks for using Cid Kagenou bot`
      });
      api.sendMessage(errMsg, threadID, messageID);
    }
  },
};