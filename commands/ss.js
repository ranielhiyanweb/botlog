const axios = require("axios");
const fs = require("fs-extra");
import AuroraBetaStyler from "../core/plugin/aurora-beta-styler";

module.exports = {
  name: "ss",
  description: "Take a screenshot of a webpage. Usage: #ss <url>",
  author: "Aljur pogoy",
  version: "4.0.0",
  role: 3,
  async run({ api, event, args }) {
    const { threadID, messageID } = event;

    let code = args.join(" ").trim();
    if (event.messageReply && event.messageReply.body) code = event.messageReply.body;

    if (!code) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Screenshot Command",
        headerSymbol: "📸",
        headerStyle: "bold",
        bodyText: "Please provide a URL to take a screenshot (e.g., #ss https://www.facebook.com).",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }

    const url = encodeURIComponent(args[0].trim());
    const apiKey = "6345c38b-47b1-4a9a-8a70-6e6f17d6641b";
    const apiUrl = `https://kaiz-apis.gleeze.com/api/screenshot?url=${url}&apikey=${apiKey}`;

    try {
      const response = await axios({
        method: "GET",
        url: apiUrl,
        responseType: "arraybuffer",
      });

      const tempPath = `./temp/ss_${messageID}.png`;
      await fs.writeFile(tempPath, response.data);

      await api.sendMessage({
        body: "Here’s the screenshot of the provided URL!",
        attachment: fs.createReadStream(tempPath),
      }, threadID, messageID);

      await fs.unlink(tempPath);
    } catch (error) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Screenshot Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Failed to take screenshot: ${error.message || "Invalid URL or API issue"}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(styledMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  },
};
