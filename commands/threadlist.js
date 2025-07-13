// just nevermind the code arrangements but at least it worked 🥲

const path = require("path");

const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugin", "aurora-beta-styler"));

module.exports = {

  name: "threadlist",

  description: "Display the current threads of the bot",

  author: "Aljur Pogoy",

  role: 3,

  async run({ api, event, admins }) {

    const { threadID, messageID, senderID } = event;

    if (!admins.includes(senderID)) {

      const errorMessage = AuroraBetaStyler.styleOutput({

        headerText: "Access Denied",

        headerSymbol: "❌",

        headerStyle: "bold",

        bodyText: "Only admins can view the thread list.",

        bodyStyle: "bold",

        footerText: "Modefied by: Raniel",

      });

      await api.sendMessage(errorMessage, threadID, messageID);

      return;

    }

    try {

      const threadList = await api.getThreadList(100, null, ["INBOX"]);

      const threads = threadList.filter(thread => thread.isGroup && thread.name !== thread.threadID && thread.threadID !== event.threadID);

      if (threads.length === 0) {

        const noThreadsMessage = AuroraBetaStyler.styleOutput({

          headerText: "Thread List",

          headerSymbol: "📋",

          headerStyle: "bold",

          bodyText: "No active group threads found.",

          bodyStyle: "bold",

          footerText: "Modefied by: Raniel",

        });

        await api.sendMessage(noThreadsMessage, threadID, messageID);

        return;

      }

      const bodyText = [

        "Active Threads:",

        ...threads.map(thread => `  - ${thread.name || thread.threadID} (ID: ${thread.threadID})`),

      ].join("\n");

      const styledMessage = AuroraBetaStyler.styleOutput({

        headerText: "Thread List",

        headerSymbol: "📋",

        headerStyle: "bold",

        bodyText,

        bodyStyle: "bold",

        footerText: "Powered by: **Aljur pogoy**",

      });

      await api.sendMessage(styledMessage, threadID, messageID);

    } catch (error) {

      console.error("Error fetching thread list:", error);

      const errorMessage = AuroraBetaStyler.styleOutput({

        headerText: "Error",

        headerSymbol: "❌",

        headerStyle: "bold",

        bodyText: "Failed to fetch thread list. Check bot permissions or session.",

        bodyStyle: "bold",

        footerText: "Modefied by: Raniel",

      });

      await api.sendMessage(errorMessage, threadID, messageID);

      await api.setMessageReaction("❌", messageID, () => {});

    }

  },

};



// You can just use this if you want, using the db collection to save all threadsID, but not real-time 
/*
const { format, UNIRedux } = require("cassidy-styler");
module.exports = {
  name: "threadlist",
  author: "Aljur Pogoy",
  version: "4.0.0",
  description: "Display a list of threads with their names from the database. Usage: #threadlist",
  async run({ api, event, args, db }) {
    const { threadID, messageID } = event;
    try {
      if (!db) return api.sendMessage(format({ title: "Thread List", titlePattern: `{emojis} ${UNIRedux.arrow} {word}`, titleFont: "double_struck", contentFont: "fancy_italic", emojis: "📜", content: `❌ Database not initialized. Ensure MongoDB is connected and try again.\n> Contact bot admin if this persists.\n> Thanks for using Cid Kagenou bot` }), threadID, messageID);
      const threads = await db.db("threads").find({}).toArray();
      if (!threads || threads.length === 0) return api.sendMessage(format({ title: "Thread List", titlePattern: `{emojis} ${UNIRedux.arrow} {word}`, titleFont: "double_struck", contentFont: "fancy_italic", emojis: "📜", content: `❌ No threads found in the database.\n> Ensure the bot has interacted with threads to populate the database.\n> Thanks for using Cid Kagenou bot` }), threadID, messageID);
      const threadDetails = threads.map(thread => `${thread.threadID}: ${thread.name || `Unnamed Thread (ID: ${thread.threadID})`}`);
      const content = `📜 Thread List:\n${threadDetails.join("\n")}\n\nTotal Threads: ${threads.length}\n> Use #threadlist to refresh\n> Thanks for using Cid Kagenou bot`;
      await api.sendMessage(format({ title: "Thread List", titlePattern: `{emojis} ${UNIRedux.arrow} {word}`, titleFont: "double_struck", contentFont: "fancy_italic", emojis: "📜", content }), threadID, messageID);
    } catch (error) {
      api.sendMessage(format({ title: "Thread List", titlePattern: `{emojis} ${UNIRedux.arrow} {word}`, titleFont: "double_struck", contentFont: "fancy_italic", emojis: "📜", content: `┏━━━━━━━┓\n┃ Error: ${error.message}\n┗━━━━━━━┛\n> Thanks for using Cid Kagenou bot` }), threadID, messageID);
    }
  },
};
*/
