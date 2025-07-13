const axios = require("axios");
const path = require("path");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins", "aurora-beta-styler"));

module.exports = {
  name: "mal",
  description: "Get anime details from MyAnimeList",
  author: "Aljur Pogoy",
  role: 0,
  async run({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!args[0]) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Please provide an anime title (e.g., /mal The misfit of demon king academy)",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(errorMessage, threadID, messageID);
      return;
    }
    const title = encodeURIComponent(args.join(" "));
    const apiKey = "6345c38b-47b1-4a9a-8a70-6e6f17d6641b";
    const url = `https://kaiz-apis.gleeze.com/api/mal?title=${title}&apikey=${apiKey}`;
    try { 
      const response = await axios.get(url);
      const animeData = response.data;
      const {
        title: animeTitle,
        japanese,
        type,
        status,
        premiered,
        aired,
        episodes,
        duration,
        genres,
        score,
        description,
        picture,
      } = animeData;

  
      const bodyText = [
        `Japanese: ${japanese || "N/A"}`,
        `Type: ${type || "N/A"}`,
        `Status: ${status || "N/A"}`,
        `Premiered: ${premiered || "N/A"}`,
        `Aired: ${aired || "N/A"}`,
        `Episodes: ${episodes || "N/A"}`,
        `Duration: ${duration || "N/A"}`,
        `Genres: ${genres || "N/A"}`,
        `Score: ${score || "N/A"}`,
        `Description: ${description || "No description available"}`,
      ].join("\n");


      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: animeTitle,
        headerSymbol: "📺",
        headerStyle: "bold",
        bodyText,
        bodyStyle: "bold",
        footerText: "Developed: **Aljur pogoy**",
      });
      const pictureResponse = await axios.get(picture, { responseType: "stream" });
      await api.sendMessage(
        { body: styledMessage, attachment: pictureResponse.data },
        threadID,
        messageID
      );
    } catch (error) {
      console.error("Error fetching anime data:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Failed to fetch anime details. Check the title or try again later!",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(errorMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  },
};
