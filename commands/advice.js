const axios = require("axios");
const path = require("path");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugin", "aurora-beta-styler"));
module.exports = {
  name: "advice",
  description: "Get random advice from the Rapido API",
  author: "Aljur Pogoy | Rapido",
  role: 0,
  async run({ api, event, args }) {
    const { threadID, messageID } = event;
    const styledMessage = (header, body, symbol) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel"
    });
    try {
      const response = await axios.get("https://rapido.zetsu.xyz/api/advice");
      const advice = response.data.advice || "No advice available.";
      const message = styledMessage("Random Advice", advice, "💡");
      await api.sendMessage(message, threadID, messageID);
    } catch (error) {
      const errorMessage = styledMessage("Error", "Failed to fetch advice. Please try again later.", "❌");
      await api.sendMessage(errorMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  }
};
