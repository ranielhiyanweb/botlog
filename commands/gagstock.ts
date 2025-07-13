import axios from "axios";
import WebSocket from "ws";
import path from "path";
import AuroraBetaStyler from "../core/plugin/aurora-beta-styler";
namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      category?: string;
    };
    run: (context: { api: any; event: any; args: string[] }) => Promise<void>;
  }
}
const activeSessions: Map<string, { ws: WebSocket; keepAlive: NodeJS.Timeout; closed: boolean }> = new Map();
const lastSentCache: Map<string, string> = new Map();
const PH_TIMEZONE = "Asia/Manila";
function pad(n: number): string {
  return n < 10 ? "0" + n : n.toString();
}
function getPHTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: PH_TIMEZONE }));
}
function getCountdown(target: Date): string {
  const now = getPHTime();
  const msLeft = target.getTime() - now.getTime();
  if (msLeft <= 0) return "00h 00m 00s";
  const h = Math.floor(msLeft / 3.6e6);
  const m = Math.floor((msLeft % 3.6e6) / 6e4);
  const s = Math.floor((msLeft % 6e4) / 1000);
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}
function getNextRestocks(): { [key: string]: string } {
  const now = getPHTime();
  const timers: { [key: string]: string } = {};
  const nextEgg = new Date(now);
  nextEgg.setMinutes(now.getMinutes() < 30 ? 30 : 0);
  if (now.getMinutes() >= 30) nextEgg.setHours(now.getHours() + 1);
  nextEgg.setSeconds(0, 0);
  timers.egg = getCountdown(nextEgg);
  const next5 = new Date(now);
  const nextM = Math.ceil((now.getMinutes() + (now.getSeconds() > 0 ? 1 : 0)) / 5) * 5;
  next5.setMinutes(nextM === 60 ? 0 : nextM, 0, 0);
  if (nextM === 60) next5.setHours(now.getHours() + 1);
  timers.gear = timers.seed = getCountdown(next5);
  const nextHoney = new Date(now);
  nextHoney.setMinutes(now.getMinutes() < 30 ? 30 : 0);
  if (now.getMinutes() >= 30) nextHoney.setHours(now.getHours() + 1);
  nextHoney.setSeconds(0, 0);
  timers.honey = getCountdown(nextHoney);
  const next7 = new Date(now);
  const totalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const next7h = Math.ceil(totalHours / 7) * 7;
  next7.setHours(next7h, 0, 0, 0);
  timers.cosmetics = getCountdown(next7);
  return timers;
}
function formatValue(val: number): string {
  if (val >= 1_000_000) return `x${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `x${(val / 1_000).toFixed(1)}K`;
  return `x${val}`;
}
function addEmoji(name: string): string {
  const emojis = {
    "Common Egg": "🥚", "Uncommon Egg": "🐣", "Rare Egg": "🍳", "Legendary Egg": "🪺", "Mythical Egg": "🔮",
    "Bug Egg": "🪲", "Cleaning Spray": "🧴", "Friendship Pot": "🪴", "Watering Can": "🚿", "Trowel": "🛠️",
    "Recall Wrench": "🔧", "Basic Sprinkler": "💧", "Advanced Sprinkler": "💦", "Godly Sprinkler": "⛲",
    "Lightning Rod": "⚡", "Master Sprinkler": "🌊", "Favorite Tool": "❤️", "Harvest Tool": "🌾", "Carrot": "🥕",
    "Strawberry": "🍓", "Blueberry": "🫐", "Orange Tulip": "🌷", "Tomato": "🍅", "Corn": "🌽", "Daffodil": "🌼",
    "Watermelon": "🍉", "Pumpkin": "🎃", "Apple": "🍎", "Bamboo": "🎍", "Coconut": "🥥", "Cactus": "🌵",
    "Dragon Fruit": "🍈", "Mango": "🥭", "Grape": "🍇", "Mushroom": "🍄", "Pepper": "🌶️", "Cacao": "🍫",
    "Beanstalk": "🌱", "Ember Lily": "🏵️", "Sugar Apple": "🍏"
  };
  return `${emojis[name] || ""} ${name}`;
}
const gagstockCommand: ShadowBot.Command = {
  config: {
    name: "gagstock",
    description: "Track Grow A Garden stock using WebSocket live updates.",
    usage: "/gagstock on | /gagstock on Sunflower | Watering Can | /gagstock off",
    category: "Tools ⚒️",
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const filters = args.slice(1).join(" ").split("|").map(f => f.trim().toLowerCase()).filter(Boolean);
    if (action === "off") {
      const session = activeSessions.get(senderID.toString());
      if (session) {
        clearInterval(session.keepAlive);
        session.closed = true;
        session.ws?.terminate();
        activeSessions.delete(senderID.toString());
        lastSentCache.delete(senderID.toString());
        const offMessage = AuroraBetaStyler.styleOutput({
          headerText: "Gagstock",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: "Gagstock tracking stopped.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(offMessage, threadID, messageID);
      } else {
        const noSessionMessage = AuroraBetaStyler.styleOutput({
          headerText: "Gagstock",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You don't have an active gagstock session.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(noSessionMessage, threadID, messageID);
      }
      return;
    }
    if (action !== "on") {
      const usageMessage = AuroraBetaStyler.styleOutput({
        headerText: "Gagstock",
        headerSymbol: "📌",
        headerStyle: "bold",
        bodyText: "Usage:\n• /gagstock on\n• /gagstock on Sunflower | Watering Can\n• /gagstock off",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
        });
      await api.sendMessage(usageMessage, threadID, messageID);
      return;
    }
    if (activeSessions.has(senderID.toString())) {
      const activeMessage = AuroraBetaStyler.styleOutput({
        headerText: "Gagstock",
        headerSymbol: "📡",
        headerStyle: "bold",
        bodyText: "You're already tracking Gagstock. Use /gagstock off to stop.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(activeMessage, threadID, messageID);
      return;
    }
    const startMessage = AuroraBetaStyler.styleOutput({
      headerText: "Gagstock",
      headerSymbol: "✅",
      headerStyle: "bold",
      bodyText: "Gagstock tracking started via WebSocket!",
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel",
    });
    await api.sendMessage(startMessage, threadID, messageID);
    let ws: WebSocket;
    let keepAliveInterval: NodeJS.Timeout;
    function connectWebSocket() {
      ws = new WebSocket("wss://gagstock.gleeze.com");
      ws.on("open", () => {
        keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 10000);
      });
      ws.on("message", async (data: string) => {
        try {
          const payload = JSON.parse(data);
          if (payload.status !== "success") return;
          const backup = payload.data;
          const stockData = {
            gearStock: backup.gear.items.map((i: { name: string; quantity: string }) => ({ name: i.name, value: Number(i.quantity) })),
            seedsStock: backup.seed.items.map((i: { name: string; quantity: string }) => ({ name: i.name, value: Number(i.quantity) })),
            eggStock: backup.egg.items.map((i: { name: string; quantity: string }) => ({ name: i.name, value: Number(i.quantity) })),
            cosmeticsStock: backup.cosmetics.items.map((i: { name: string; quantity: string }) => ({ name: i.name, value: Number(i.quantity) })),
            honeyStock: backup.honey.items.map((i: { name: string; quantity: string }) => ({ name: i.name, value: Number(i.quantity) })),
          };
          const currentKey = JSON.stringify({
            gearStock: stockData.gearStock,
            seedsStock: stockData.seedsStock,
          });
          const lastSent = lastSentCache.get(senderID.toString());
          if (lastSent === currentKey) return;
          lastSentCache.set(senderID.toString(), currentKey);
          const restocks = getNextRestocks();
          const formatList = (arr: { name: string; value: number }[]) => arr.map(i => `- ${addEmoji(i.name)}: ${formatValue(i.value)}`).join("\n");
          let filteredContent = "";
          let matched = 0;
          const addSection = (label: string, items: { name: string; value: number }[], restock: string) => {
            const filtered = filters.length ? items.filter(i => filters.some(f => i.name.toLowerCase().includes(f))) : items;
            if (label === "Gear" || label === "Seeds") {
              if (filtered.length > 0) {
                matched += filtered.length;
                filteredContent += `${label}:\n${formatList(filtered)}\n⏳ Restock In: ${restock}\n\n`;
              }
            } else {
              filteredContent += `${label}:\n${formatList(items)}\n⏳ Restock In: ${restock}\n\n`;
            }
          };
          addSection("Gear", stockData.gearStock, restocks.gear);
          addSection("Seeds", stockData.seedsStock, restocks.seed);
          addSection("Eggs", stockData.eggStock, restocks.egg);
          addSection("Cosmetics", stockData.cosmeticsStock, restocks.cosmetics);
          addSection("Honey", stockData.honeyStock, restocks.honey);
          if (matched === 0 && filters.length > 0) return;
          const updatedAtPH = getPHTime().toLocaleString("en-PH", {
            hour: "numeric", minute: "numeric", second: "numeric",
            hour12: true, day: "2-digit", month: "short", year: "numeric"
          });
          const weather = await axios.get("https://growagardenstock.com/api/stock/weather").then(res => res.data).catch(() => null);
          const weatherInfo = weather ? `🌤️ Weather: ${weather.icon} ${weather.weatherType}\n📋 ${weather.description}\n🎯 ${weather.cropBonuses}\n` : "";
          const message = AuroraBetaStyler.styleOutput({
            headerText: "Grow A Garden Tracker",
            headerSymbol: "🌾",
            headerStyle: "bold",
            bodyText: `${filteredContent}${weatherInfo}📅 Updated at (PH): ${updatedAtPH}`,
            bodyStyle: "bold",
            footerText: "Powered by: **Aljur pogoy**",
          });
          if (!activeSessions.has(senderID.toString())) return;
          await api.sendMessage(message, threadID, messageID);
        } catch (e) {}
      });
      ws.on("close", () => {
        clearInterval(keepAliveInterval);
        const session = activeSessions.get(senderID.toString());
        if (session && !session.closed) setTimeout(connectWebSocket, 3000);
      });
      ws.on("error", () => {
        ws.close();
      });
      activeSessions.set(senderID.toString(), { ws, keepAlive: keepAliveInterval, closed: false });
    }
    connectWebSocket();
  },
};
export default gagstockCommand;
