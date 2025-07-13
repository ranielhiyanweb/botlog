const axios = require("axios");
module.exports = {
    config: {
        name: "removebg",
        description: "rbg sir!.",
        author: "Aljur pogoy",
        usage: "removebg(reply to a photo)",
        nonPrefix: true,
        version: "4.0.0"
    },
    run: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, messageReply } = event;
        if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0 || messageReply.attachments[0].type !== "photo") {
            return api.sendMessage(
                "Please reply to a message containing a photo to enhance it with Remini.\nUsage: Reply to a photo with #remini",
                threadID,
                messageID
            );
        }
        const photoUrl = messageReply.attachments[0].url;
        try {
            const response = await axios.get("https://kaiz-apis.gleeze.com/api/removebg", {
                params: {
                    url: photoUrl,
                    stream: true
                },
                responseType: "stream"
            });
            const contentType = response.headers["content-type"];
            if (!contentType || !contentType.startsWith("image/")) {
                return api.sendMessage(
                    "err sir!",
                    threadID,
                    messageID
                );
            }
            const messageContent = "✨ There you go!.";
            const sendOptions = {
                body: messageContent,
                attachment: response.data
            };
            api.sendMessage(sendOptions, threadID, (err, messageInfo) => {
                if (err) {
                    console.error("Error sending remini message:", err);
                    api.sendMessage("Failed to send the enhanced image.", threadID, messageID);
                }
            }, messageID);
        } catch (error) {
            console.error("Error in remini command:", error.message);
            api.sendMessage(
                `An error occurred while rbg the image: ${error.message}\n`,
                threadID,
                messageID
            );
        }
    }
};