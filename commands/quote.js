const axios = require("axios");
const path = require("path");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugin", "aurora-beta-styler"));
module.exports = {
  name: "quote",
  description: "Get a random quote",
  author: "Aljur Pogoy",
  aliases: ["q"],
  role: 0,
  async run({ api, event, args }) {
    const { threadID, messageID } = event;
    const styledMessage = (header, body, symbol) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "monospace",
      footerText: "Modefied by: Raniel"
    });
    try {
      const response = await axios.get("https://rapido.zetsu.xyz/api/quote");
      const { quote, author } = response.data;
      const bodyText = quote ? `"${quote}"\n— ${author || "Unknown"}` : "No quote available.";
      const message = styledMessage("Random Quote", bodyText, "📜");
      await api.sendMessage(message, threadID, messageID);
    } catch (error) {
      const errorMessage = styledMessage("Error", "Failed to fetch quote. Please try again later.", "❌");
      await api.sendMessage(errorMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  }
};
