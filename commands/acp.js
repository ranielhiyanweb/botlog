const path = require("path");
const moment = require("moment-timezone");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins", "aurora-beta-styler"));
module.exports = {
  name: "acp",
  nonPrefix: true,
  description: "Accepts friend requests from users",
  author: "Aljur Pogoy | Francis Loyd Raval",
  aliases: ["accept"],
  role: 1,
  async run({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const styledMessage = (header, body, symbol) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel Hiyan"
    });
    const handleApprove = async (targetUID) => {
      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
        doc_id: "3147613905362928",
        variables: JSON.stringify({
          input: {
            source: "friends_tab",
            actor_id: api.getCurrentUserID(),
            friend_requester_id: targetUID,
            client_mutation_id: Math.round(Math.random() * 19).toString()
          },
          scale: 3,
          refresh_num: 0
        })
      };
      const success = [];
      const failed = [];
      try {
        const friendRequest = await api.httpPost("https://www.facebook.com/api/graphql/", form);
        if (JSON.parse(friendRequest).errors) failed.push(targetUID);
        else success.push(targetUID);
      } catch (e) {
        failed.push(targetUID);
      }
      return { success, failed };
    };
    const getPendingRequests = async () => {
      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
        fb_api_caller_class: "RelayModern",
        doc_id: "4499164963466303",
        variables: JSON.stringify({ input: { scale: 3 } })
      };
      try {
        const listRequest = JSON.parse(await api.httpPost("https://www.facebook.com/api/graphql/", form)).data.viewer.friending_possibilities.edges;
        let requests = listRequest.map((user, index) => ({
          index: index + 1,
          name: user.node.name,
          id: user.node.id,
          url: user.node.url.replace("www.facebook", "facebook"),
          time: moment(user.time * 1000).tz("Asia/Manila").format("DD/MM/YYYY HH:mm:ss")
        }));
        return requests;
      } catch (error) {
        throw new Error(`Failed to fetch friend requests. Please try again later. ${error.message}`);
      }
    };
    const printPendingRequests = async (requests, page = 1, limit = 10) => {
      if (requests.length === 0) {
        await api.sendMessage(styledMessage("Friend Requests", "There are no pending friend requests.", "📋"), threadID, messageID);
        return;
      }
      const totalPages = Math.ceil(requests.length / limit);
      if (page > totalPages || page < 1) {
        const errorMessage = styledMessage("Error", `Invalid page number. There are only ${totalPages} pages.`, "❌");
        await api.sendMessage(errorMessage, threadID, messageID);
        await api.setMessageReaction("❌", messageID, () => {});
        return;
      }
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedRequests = requests.slice(start, end);
      let msg = `Page ${page}/${totalPages}:\n`;
      for (const req of paginatedRequests) {
        msg += `${req.index}. Name: ${req.name}\nID: ${req.id}\nURL: ${req.url}\nTime: ${req.time}\n`;
      }
      msg += `Use "acp [page]" to navigate or "acp approve [number]" to approve a friend request.`;
      await api.sendMessage(styledMessage("Friend Requests", msg, "📋"), threadID, messageID);
    };
    try {
      const requests = await getPendingRequests();
      if (args[0]?.toLowerCase() === "approve") {
        if (args.length !== 2 || isNaN(args[1])) {
          const errorMessage = styledMessage("Error", `Invalid syntax. Use: acp approve [number]`, "❌");
          await api.sendMessage(errorMessage, threadID, messageID);
          await api.setMessageReaction("❌", messageID, () => {});
          return;
        }
        const requestNumber = parseInt(args[1], 10);
        if (requestNumber > 0 && requestNumber <= requests.length) {
          const targetUID = requests[requestNumber - 1].id;
          const { success, failed } = await handleApprove(targetUID);
          if (success.length > 0) {
            await api.sendMessage(styledMessage("Success", `Approved friend request for UID ${success.join(", ")}`, "✅"), threadID, messageID);
          }
          if (failed.length > 0) {
            const errorMessage = styledMessage("Error", `Failed to approve friend request for UID ${failed.join(", ")}`, "❌");
            await api.sendMessage(errorMessage, threadID, messageID);
            await api.setMessageReaction("❌", messageID, () => {});
          }
        } else {
          const errorMessage = styledMessage("Error", `Invalid number. Please choose a valid request number.`, "❌");
          await api.sendMessage(errorMessage, threadID, messageID);
          await api.setMessageReaction("❌", messageID, () => {});
        }
      } else {
        let page = 1;
        if (args[0] && !isNaN(args[0])) {
          page = parseInt(args[0], 10);
        }
        await printPendingRequests(requests, page);
      }
    } catch (error) {
      const errorMessage = styledMessage("Error", `Failed to fetch friend requests: ${error.message}`, "❌");
      await api.sendMessage(errorMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  }
};
