const { exec } = require("child_process");
const { promisify } = require("util");
import AuroraBetaStyler from "../core/plugins/aurora-beta-styler";
module.exports = {
  name: "python",
  description: "Compile and run Python code locally. Usage: #python <code> or reply with code",
  author: "Aljur pogoy",
  version: "4.0.0",
  async run({ api, event, args }) {
    const { threadID, messageID } = event;
    let code = args.join(" ").trim();
    if (event.messageReply && event.messageReply.body) code = event.messageReply.body;
    if (!code) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Python Command",
        headerSymbol: "🐍",
        headerStyle: "bold",
        bodyText: "Please provide Python code to run (e.g., #python print('Hello')) or reply with code.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }
    const dangerousKeywords = [
      "os.system", "subprocess", "exec", "eval", "import os", "import subprocess",
      "while true", "while 1", "while(true)", "while(1)", "for;;", "for(;;)",
      "__import__", "open(", "write(", "read(", "input(",
      "niggers", "fuck you", "fucking", "shit", "asshole", "bitch"
    ];
    const codeLower = code.toLowerCase();
    if (dangerousKeywords.some(keyword => codeLower.includes(keyword))) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Security Alert",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Security restriction: Dangerous or inappropriate commands (e.g., bad words, 'while True', 'for;;', 'os.system', or file operations) are not allowed.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }
    const bigNumbers = code.match(/\d{7,}/g);
    if (bigNumbers) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Anti-Spam Alert",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Anti-spam: Code contains very large numbers, which can freeze execution.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }
    const printCount = (code.match(/print/g) || []).length;
    if (printCount > 10) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Anti-Spam Alert",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Anti-spam: Too many print statements (limit: 10).",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }
    const loopCount = (code.match(/for\s|while\s/g) || []).length;
    if (loopCount > 3) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Anti-Spam Alert",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Anti-spam: Too many loops detected (limit: 3).",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }
    const rangeMatch = code.match(/range\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (end - start > 100) {
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: "Anti-Spam Alert",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Anti-spam: Range iteration exceeds 100 items (e.g., for i in range(1, 1001)).",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        return api.sendMessage(styledMessage, threadID, messageID);
      }
    }
    if (code.length > 300) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Anti-Spam Alert",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Anti-spam: Code exceeds 300 characters.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }
    const execPromise = promisify(exec);
    try {
      const escapedCode = code.replace(/"/g, '\\"');
      const command = `python3 -c "${escapedCode}"`;
      const { stdout, stderr } = await execPromise(command, { timeout: 5000, maxBuffer: 512 * 1024 });
      if (stdout.length > 4096) {
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: "Anti-Spam Alert",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Anti-spam: Output exceeds 4096 characters.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        return api.sendMessage(styledMessage, threadID, messageID);
      }
      let responseMessage = "";
      if (stdout) responseMessage += `✅ Python Output:\n${stdout.trim()}\n`;
      if (stderr) responseMessage += `⚠ Python Error:\n${stderr.trim()}\n`;
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Python Execution",
        headerSymbol: "🐍",
        headerStyle: "bold",
        bodyText: responseMessage || "✅ Code executed with no output.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(styledMessage, threadID, messageID);
    } catch (error) {
      let errorMessage = error.message;
      if (error.stderr) errorMessage = error.stderr.trim();
      else if (error.stdout) errorMessage = error.stdout.trim();
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Compilation Error",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Compilation Error: ${errorMessage || "Failed to execute Python code"}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(styledMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  },
};
