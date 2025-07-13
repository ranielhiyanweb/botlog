const AuroraBetaStyler = require('@aurora/styler');
const { LINE } = AuroraBetaStyler;

const busyCommand = {
  config: {
    name: 'busy',
    description: 'Set, list, or remove global busy messages for users across all threads',
    usage: 'busy set <message> | busy list | busy remove',
    role: 0,
    cooldown: 5,
    aliases: ['afk'],
    category: 'Utility ⚙️',
  },
  handleEvent: async ({ api, event, db }) => {
    if (event.type !== 'message' && event.type !== 'message_reply') return;
    const { threadID, messageID, mentions } = event;

    try {
      const usersData = db ? await db.db('users').find({ busy: { $exists: true } }).toArray() : [];
      const busyList = {};
      usersData.forEach(user => {
        busyList[user.userID] = user.busy;
      });

      if (!Object.keys(busyList).length) return;

      for (const userID in mentions) {
        if (busyList[userID]) {
          const { userName, message } = busyList[userID];
          const styledMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User Busy',
            headerSymbol: '⏳',
            headerStyle: 'bold',
            bodyText: `${userName} (${userID}) is busy.\n${LINE}\nReason: ${message}\n`,
            bodyStyle: 'bold',
            footerText: 'Modefied by: Raniely',
          });
          await api.sendMessage(
            { body: styledMessage, mentions: [{ tag: `@${userName}`, id: userID }] },
            threadID,
            messageID 
          );
        }
      }
    } catch (error) {
      console.error(`[EVENT_DEBUG] busy handleEvent failed:`, error);
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `${LINE}\nFailed to process busy response: ${error.message}\n${LINE}`,
        bodyStyle: 'bold',
        footerText: 'Modefied by: Raniely',
      });
      await api.sendMessage(styledMessage, threadID, messageID);
    }
  },
  run: async ({ api, event, args, db }) => {
    const { threadID, messageID, senderID } = event;

    if (!args.length) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Invalid Input',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `\nUsage: /busy set <message> | /busy list | /busy remove`,
        bodyStyle: 'bold',
        footerText: 'Modefied by: Raniely',
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }

    const subcommand = args[0].toLowerCase();
    let busyList = {};
    try {
      const usersData = db ? await db.db('users').find({ busy: { $exists: true } }).toArray() : [];
      usersData.forEach(user => {
        busyList[user.userID] = user.busy;
      });
    } catch (error) {
    }

    if (subcommand === 'set' && args.length > 1) {
      const message = args.slice(1).join(' ').trim();
      if (!message) {
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Invalid Input',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `${LINE}\nPlease provide a busy message (e.g., /busy set I’m busy!).\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        return api.sendMessage(styledMessage, threadID, messageID);
      }

      try {
        const userInfo = await api.getUserInfo([senderID]);
        const userName = userInfo[senderID]?.name || 'Unknown';
        busyList[senderID] = { message, userName };
        if (db) {
          await db.db('users').updateOne(
            { userID: senderID },
            { $set: { busy: { message, userName } } },
            { upsert: true }
          );
        }
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Busy Status Set',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: `${LINE}\nGlobal busy message set for ${userName} (${senderID}): ${message}\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
      } catch (error) {
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `${LINE}\nFailed to set busy message: ${error.message}\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        await api.setMessageReaction('❌', messageID, () => {});
      }
    } else if (subcommand === 'list') {
      try {
        if (!Object.keys(busyList).length) {
          const styledMessage = AuroraBetaStyler.styleOutput({
            headerText: 'No Busy Users',
            headerSymbol: 'ℹ️',
            headerStyle: 'bold',
            bodyText: `${LINE}\nNo users have set a global busy status.\n${LINE}`,
            bodyStyle: 'bold',
            footerText: 'Modefied by: Raniely',
          });
          return api.sendMessage(styledMessage, threadID, messageID);
        }

        const busyText = Object.entries(busyList)
          .map(([userID, data]) => `${data.userName} (${userID}): ${data.message}`)
          .join('\n');
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Global Busy Users List',
          headerSymbol: '📋',
          headerStyle: 'bold',
          bodyText: `Busy users across all threads:\n${LINE}\n${busyText}\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        console.log(`[EVENT_DEBUG] global busy list displayed for thread ${threadID}`);
      } catch (error) {
        console.error(`[EVENT_DEBUG] busy list failed:`, error);
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `${LINE}\nFailed to list busy users: ${error.message}\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        await api.setMessageReaction('❌', messageID, () => {});
      }
    } else if (subcommand === 'remove') {
      if (!busyList[senderID]) {
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Not Busy',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `${LINE}\nYou have not set a global busy status.\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        return api.sendMessage(styledMessage, threadID, messageID);
      }

      try {
        const { userName } = busyList[senderID];
        if (db) {
          await db.db('users').deleteOne({ userID: senderID });
        }
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Busy Status Removed',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: `${LINE}\n${userName} (${senderID}) is no longer busy globally.\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        console.log(`[EVENT_DEBUG] busy status removed globally for user ${senderID}`);
      } catch (error) {
        console.error(`[EVENT_DEBUG] busy remove failed:`, error);
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `${LINE}\nFailed to remove busy status: ${error.message}\n${LINE}`,
          bodyStyle: 'bold',
          footerText: 'Modefied by: Raniely',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        await api.setMessageReaction('❌', messageID, () => {});
      }
    } else {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Invalid Subcommand',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `${LINE}\nUsage: /busy set <message> | /busy list | /busy remove\n${LINE}`,
        bodyStyle: 'bold',
        footerText: 'Modefied by: Raniely',
      });
      await api.sendMessage(styledMessage, threadID, messageID);
    }
  },
};

module.exports = busyCommand;
