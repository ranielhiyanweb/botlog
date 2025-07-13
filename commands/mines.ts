import AuroraBetaStyler from "../core/plugin/aurora-beta-styler";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      category?: string;
    };
    run: (context: { api: any; event: any; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

interface MinerData {
  userID: string;
  name?: string;
  started?: boolean;
  exp: number;
  materials: { diamondOre: number; goldOre: number; silverOre: number };
  equipment: { pickaxes: { [key: string]: number }; currentPickaxe?: string };
  lastActive?: string;
  afkMaterials?: { diamondOre: number; goldOre: number; silverOre: number };
  rank: string;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function determineRank(exp: number) {
  if (exp >= 1000000) return "S";
  if (exp >= 5000) return "A";
  if (exp >= 2500) return "B";
  if (exp >= 1000) return "C";
  if (exp >= 500) return "D";
  return "E";
}

function getCollectionMultiplier(pickaxeLevel: number, rank: string) {
  if (pickaxeLevel >= 80) return rank === "S" ? 200 : 50;
  if (rank === "S") return 200;
  if (pickaxeLevel >= 30 && pickaxeLevel <= 80) return 15;
  if (pickaxeLevel >= 15 && pickaxeLevel < 30) return 9;
  if (pickaxeLevel === 3) return 6;
  if (pickaxeLevel === 2) return 4;
  if (pickaxeLevel === 1) return 2;
  return pickaxeLevel;
}

async function saveMinerData(db: any, senderID: string, data: MinerData) {
  const minersCollection = db.db("miners");
  await minersCollection.updateOne(
    { userID: senderID },
    { $set: data },
    { upsert: true }
  );
}

async function getMinerData(db: any, senderID: string) {
  const minersCollection = db.db("miners");
  const result = await minersCollection.findOne({ userID: senderID });
  const defaultData = {
    userID: senderID,
    exp: 0,
    materials: { diamondOre: 0, goldOre: 0, silverOre: 0 },
    equipment: { pickaxes: { "wooden_pickaxe": 1 } },
    rank: "E",
    lastActive: new Date().toISOString(),
    afkMaterials: { diamondOre: 0, goldOre: 0, silverOre: 0 },
  };
  const data = result ? { ...defaultData, ...result } : defaultData;
  if (!data.equipment.pickaxes || Object.keys(data.equipment.pickaxes).length === 0) {
    data.equipment.pickaxes = { "wooden_pickaxe": 1 };
  }
  data.rank = determineRank(data.exp);
  return data;
}

const minesCommand: ShadowBot.Command = {
  config: {
    name: "mines",
    description: "Manage your mining activities, shop, and ranks.",
    usage: "/mines register <name> | /mines start <name_pickaxe> | /mines collect | /mines start switch <name_pickaxe> | /mines rest | /mines tournament | /mines shop | /mines buy <key> | /mines upgrade | /mines leaderboard",
    category: "Games 🎮",
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage("Database not available.", event.threadID, event.messageID);
      return;
    }
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const userData = await getMinerData(db, senderID.toString());

    userData.lastActive = new Date().toISOString();
    await saveMinerData(db, senderID.toString(), userData);

    if (action === "register") {
      const name = args[1];
      if (!name) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "Mines",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a name. Usage: /mines register <name>",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(errorMessage, threadID, messageID);
        return;
      }
      if (userData.name) {
        const alreadyRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Mines",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `You are already registered as ${userData.name}. Use /mines profile to check your status.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(alreadyRegistered, threadID, messageID);
        return;
      }
      userData.name = name;
      await saveMinerData(db, senderID.toString(), userData);
      const registerMessage = AuroraBetaStyler.styleOutput({
        headerText: "Mines",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Registered as ${name}. Use /mines start <name_pickaxe> to begin mining!`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(registerMessage, threadID, messageID);
      userData.exp += 200;
      await saveMinerData(db, senderID.toString(), userData);
      return;
    }

    if (!userData.name) {
      const notRegistered = AuroraBetaStyler.styleOutput({
        headerText: "Mines",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "You need to register first. Usage: /mines register <name>",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(notRegistered, threadID, messageID);
      return;
    }

    if (action === "start") {
      const pickaxe = args[1]?.toLowerCase().replace(" ", "_");
      if (!pickaxe) {
        const noPickaxe = AuroraBetaStyler.styleOutput({
          headerText: "Mines",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please specify a pickaxe. Usage: /mines start <name_pickaxe>",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(noPickaxe, threadID, messageID);
        return;
      }
      if (!userData.equipment.pickaxes[pickaxe]) {
        const invalidPickaxe = AuroraBetaStyler.styleOutput({
          headerText: "Mines",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Invalid pickaxe. Available pickaxe: ${Object.keys(userData.equipment.pickaxes)[0].replace("_", " ")}. Use /mines inventory to verify.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidPickaxe, threadID, messageID);
        return;
      }
      if (args[2]?.toLowerCase() === "switch") {
        const switchPickaxe = args[3]?.toLowerCase().replace(" ", "_");
        if (!switchPickaxe || !userData.equipment.pickaxes[switchPickaxe]) {
          const invalidSwitch = AuroraBetaStyler.styleOutput({
            headerText: "Mines",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: `Invalid pickaxe for switch. Available pickaxe: ${Object.keys(userData.equipment.pickaxes)[0].replace("_", " ")}. Usage: /mines start switch <name_pickaxe>`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(invalidSwitch, threadID, messageID);
          return;
        }
        userData.equipment.currentPickaxe = switchPickaxe;
        const switchMessage = AuroraBetaStyler.styleOutput({
          headerText: "Mines",
          headerSymbol: "🔧",
          headerStyle: "bold",
          bodyText: `Switched to ${switchPickaxe.replace("_", " ")} (Level ${userData.equipment.pickaxes[switchPickaxe]}). Use /mines collect to mine with it.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(switchMessage, threadID, messageID);
        userData.exp += 200;
        await saveMinerData(db, senderID.toString(), userData);
        return;
      }
      userData.started = true;
      userData.equipment.currentPickaxe = pickaxe;
      await saveMinerData(db, senderID.toString(), userData);
      const startMessage = AuroraBetaStyler.styleOutput({
        headerText: "Mines",
        headerSymbol: "⛏️",
        headerStyle: "bold",
        bodyText: `Mining started with ${pickaxe.replace("_", " ")} (Level ${userData.equipment.pickaxes[pickaxe]}). Use /mines collect to gather resources!`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(startMessage, threadID, messageID);
      userData.exp += 200;
      await saveMinerData(db, senderID.toString(), userData);
      return;
    }

    if (action === "collect") {
      if (!userData.started || !userData.equipment.currentPickaxe) {
        const notStarted = AuroraBetaStyler.styleOutput({
          headerText: "Mines",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You must start mining first! Use /mines start <name_pickaxe>.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(notStarted, threadID, messageID);
        return;
      }

      const currentPickaxe = userData.equipment.currentPickaxe;
      const equipmentLevel = userData.equipment.pickaxes[currentPickaxe];
      const multiplier = getCollectionMultiplier(equipmentLevel, userData.rank);

      const now = new Date();
      const lastActive = new Date(userData.lastActive);
      const afkDuration = (now.getTime() - lastActive.getTime()) / (1000 * 60);

      if (afkDuration >= 5) {
        const afkCycles = Math.floor(afkDuration / 5);
        const baseDiamonds = getRandomInt(0, 6);
        const baseGold = getRandomInt(0, 10);
        const baseSilver = getRandomInt(0, 20);
        const afkDiamonds = Math.floor(baseDiamonds * multiplier * afkCycles);
        const afkGold = Math.floor(baseGold * multiplier * afkCycles);
        const afkSilver = Math.floor(baseSilver * multiplier * afkCycles);
        const dirtChance = Math.random() < 0.3;

        if (!dirtChance) {
          userData.afkMaterials.diamondOre += afkDiamonds;
          userData.afkMaterials.goldOre += afkGold;
          userData.afkMaterials.silverOre += afkSilver;
        }

        const collectMessage = `Collected ${afkDiamonds} diamond${afkDiamonds !== 1 ? "s" : ""} ore${afkDiamonds ? "," : ""} ${afkGold} gold${afkGold !== 1 ? "s" : ""} ore${afkGold ? "," : ""} ${afkSilver} silver${afkSilver !== 1 ? "s" : ""} ore while AFK (x${multiplier} multiplier over ${afkCycles * 5} minutes)!`;
        const afkResult = AuroraBetaStyler.styleOutput({
          headerText: "Mines Collect",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: collectMessage,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(afkResult, threadID, messageID);
      }

      const baseDiamonds = getRandomInt(0, 6);
      const baseGold = getRandomInt(0, 10);
      const baseSilver = getRandomInt(0, 20);
      const diamonds = Math.floor(baseDiamonds * multiplier);
      const gold = Math.floor(baseGold * multiplier);
      const silver = Math.floor(baseSilver * multiplier);
      const dirtChance = Math.random() < 0.3;
      let collectMessage = "";
      if (dirtChance) {
        collectMessage = `Collected some dirt with ${currentPickaxe.replace("_", " ")}... Better luck next time!`;
      } else {
        userData.materials.diamondOre += diamonds;
        userData.materials.goldOre += gold;
        userData.materials.silverOre += silver;
        userData.exp += 200;
        collectMessage = `Collected ${diamonds} diamond${diamonds !== 1 ? "s" : ""} ore${diamonds ? "," : ""} ${gold} gold${gold !== 1 ? "s" : ""} ore${gold ? "," : ""} ${silver} silver${silver !== 1 ? "s" : ""} ore with ${currentPickaxe.replace("_", " ")} (x${multiplier} multiplier)!`;
      }

      if (userData.afkMaterials.diamondOre > 0 || userData.afkMaterials.goldOre > 0 || userData.afkMaterials.silverOre > 0) {
        userData.materials.diamondOre += userData.afkMaterials.diamondOre;
        userData.materials.goldOre += userData.afkMaterials.goldOre;
        userData.materials.silverOre += userData.afkMaterials.silverOre;
        userData.afkMaterials = { diamondOre: 0, goldOre: 0, silverOre: 0 };
        collectMessage += "\nCollected all AFK-gathered materials!";
      }

      const collectResult = AuroraBetaStyler.styleOutput({
        headerText: "Mines Collect",
        headerSymbol: "⛏️",
        headerStyle: "bold",
        bodyText: collectMessage,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(collectResult, threadID, messageID);
      await saveMinerData(db, senderID.toString(), userData);
      return;
    }

    if (action === "profile") {
      const currentPickaxe = userData.equipment.currentPickaxe || "wooden_pickaxe";
      const profileMessage = AuroraBetaStyler.styleOutput({
        headerText: "Miner Profile",
        headerSymbol: "⛏️",
        headerStyle: "bold",
        bodyText: `Name: ${userData.name}\nEXP: ${userData.exp}\nRank: ${userData.rank}\nCurrent Pickaxe: ${currentPickaxe.replace("_", " ")} (Level ${userData.equipment.pickaxes[currentPickaxe] || 1})`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(profileMessage, threadID, messageID);
      return;
    }

    if (action === "inventory") {
      const { diamondOre, goldOre, silverOre } = userData.materials;
      const afkDiamonds = userData.afkMaterials?.diamondOre || 0;
      const afkGold = userData.afkMaterials?.goldOre || 0;
      const afkSilver = userData.afkMaterials?.silverOre || 0;
      const inventoryMessage = AuroraBetaStyler.styleOutput({
        headerText: "Miner Inventory",
        headerSymbol: "🛒",
        headerStyle: "bold",
        bodyText: `Materials:\n- Diamond Ore: ${diamondOre}\n- Gold Ore: ${goldOre}\n- Silver Ore: ${silverOre}\nAFK Materials (Collect with /mines collect):\n- Diamond Ore: ${afkDiamonds}\n- Gold Ore: ${afkGold}\n- Silver Ore: ${afkSilver}\nEquipment: ${Object.keys(userData.equipment.pickaxes)[0].replace("_", " ")} (Level ${userData.equipment.pickaxes[Object.keys(userData.equipment.pickaxes)[0]]})`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(inventoryMessage, threadID, messageID);
      return;
    }

    if (action === "rest") {
      const expGain = getRandomInt(50, 200);
      userData.exp += expGain + 200;
      userData.rank = determineRank(userData.exp);
      await saveMinerData(db, senderID.toString(), userData);
      const restMessage = AuroraBetaStyler.styleOutput({
        headerText: "Mines Rest",
        headerSymbol: "💤",
        headerStyle: "bold",
        bodyText: `Gained ${expGain} EXP! New Rank: ${userData.rank}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(restMessage, threadID, messageID);
      return;
    }

    if (action === "tournament") {
      const enemies = ["Iron Golem", "Cave Spider", "Zombie Miner", "Lava Slime"];
      const enemy = enemies[getRandomInt(0, enemies.length - 1)];
      const expGain = getRandomInt(500, 1000);
      userData.exp += expGain + 200;
      userData.rank = determineRank(userData.exp);
      await saveMinerData(db, senderID.toString(), userData);
      const tournamentMessage = AuroraBetaStyler.styleOutput({
        headerText: "Mines Tournament",
        headerSymbol: "🏆",
        headerStyle: "bold",
        bodyText: `Fought ${enemy}, gained ${expGain} EXP! New Rank: ${userData.rank}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(tournamentMessage, threadID, messageID);
      return;
    }

    if (action === "shop") {
      interface ShopItem {
        cost: { silverOre: number; goldOre?: number; diamondOre?: number };
        level?: number;
        effect?: string;
        amount?: number;
      }
      const shopItems: { [key: string]: ShopItem } = {
        wooden_pickaxe: { cost: { silverOre: 50 }, level: 1, effect: "Basic mining tool" },
        iron_pickaxe: { cost: { silverOre: 150, goldOre: 10 }, level: 2, effect: "Increases ore yield by 2x" },
        diamond_pickaxe: { cost: { silverOre: 300, goldOre: 30, diamondOre: 5 }, level: 3, effect: "Increases ore yield by 3x" },
        obsidian_pickaxe: { cost: { silverOre: 500, goldOre: 50, diamondOre: 20 }, level: 15, effect: "Increases ore yield by 9x" },
        emerald_pickaxe: { cost: { silverOre: 800, goldOre: 100, diamondOre: 40 }, level: 30, effect: "Increases ore yield by 15x" },
        ruby_pickaxe: { cost: { silverOre: 1200, goldOre: 200, diamondOre: 80 }, level: 50, effect: "Increases ore yield by 25x" },
        sapphire_pickaxe: { cost: { silverOre: 1500, goldOre: 300, diamondOre: 120 }, level: 60, effect: "Increases ore yield by 35x" },
        amethyst_pickaxe: { cost: { silverOre: 2000, goldOre: 400, diamondOre: 200 }, level: 75, effect: "Increases ore yield by 50x" },
        diamond_ore: { cost: { silverOre: 20 }, amount: 1 },
        gold_ore: { cost: { silverOre: 10 }, amount: 1 },
      };
      const shopMessage = AuroraBetaStyler.styleOutput({
        headerText: "Miner Shop",
        headerSymbol: "🛍️",
        headerStyle: "bold",
        bodyText: Object.entries(shopItems).map(([key, details]) => {
          const costStr = Object.entries(details.cost)
            .map(([resource, amount]) => `${amount} ${resource}`)
            .join(", ");
          const displayText = details.effect ? `${details.effect}` : `Get ${details.amount || 0} ${key.replace("_", " ")}`;
          return `- ${key}: ${displayText} (Cost: ${costStr})`;
        }).join("\n") + "\nUse /mines buy <key> to purchase.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(shopMessage, threadID, messageID);
      userData.exp += 200;
      await saveMinerData(db, senderID.toString(), userData);
      return;
    }

    if (action === "buy") {
      interface ShopItem {
        cost: { silverOre: number; goldOre?: number; diamondOre?: number };
        level?: number;
        effect?: string;
        amount?: number;
      }
      const shopItems: { [key: string]: ShopItem } = {
        wooden_pickaxe: { cost: { silverOre: 50 }, level: 1, effect: "Basic mining tool" },
        iron_pickaxe: { cost: { silverOre: 150, goldOre: 10 }, level: 2, effect: "Increases ore yield by 2x" },
        diamond_pickaxe: { cost: { silverOre: 300, goldOre: 30, diamondOre: 5 }, level: 3, effect: "Increases ore yield by 3x" },
        obsidian_pickaxe: { cost: { silverOre: 500, goldOre: 50, diamondOre: 20 }, level: 15, effect: "Increases ore yield by 9x" },
        emerald_pickaxe: { cost: { silverOre: 800, goldOre: 100, diamondOre: 40 }, level: 30, effect: "Increases ore yield by 15x" },
        ruby_pickaxe: { cost: { silverOre: 1200, goldOre: 200, diamondOre: 80 }, level: 50, effect: "Increases ore yield by 25x" },
        sapphire_pickaxe: { cost: { silverOre: 1500, goldOre: 300, diamondOre: 120 }, level: 60, effect: "Increases ore yield by 35x" },
        amethyst_pickaxe: { cost: { silverOre: 2000, goldOre: 400, diamondOre: 200 }, level: 75, effect: "Increases ore yield by 50x" },
        diamond_ore: { cost: { silverOre: 20 }, amount: 1 },
        gold_ore: { cost: { silverOre: 10 }, amount: 1 },
      };
      const key = args[1]?.toLowerCase();
      if (!key || !shopItems[key]) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Miner Shop",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid key. Use /mines shop to see available keys.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      const itemData = shopItems[key];
      const canAfford = userData.materials.diamondOre >= (itemData.cost.diamondOre || 0) &&
                       userData.materials.goldOre >= (itemData.cost.goldOre || 0) &&
                       userData.materials.silverOre >= (itemData.cost.silverOre || 0);
      if (!canAfford) {
        const insufficientMessage = AuroraBetaStyler.styleOutput({
          headerText: "Miner Shop",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "You don't have enough resources to buy this item.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(insufficientMessage, threadID, messageID);
        return;
      }
      userData.materials.diamondOre -= itemData.cost.diamondOre || 0;
      userData.materials.goldOre -= itemData.cost.goldOre || 0;
      userData.materials.silverOre -= itemData.cost.silverOre || 0;
      if (itemData.level) {
        userData.equipment.pickaxes = { [key]: itemData.level };
        userData.equipment.currentPickaxe = key;
      } else if (itemData.amount) {
        const material = key.replace("_", " ") as keyof typeof userData.materials;
        userData.materials[material] += itemData.amount;
      }
      await saveMinerData(db, senderID.toString(), userData);
      const buyMessage = AuroraBetaStyler.styleOutput({
        headerText: "Miner Shop",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Purchased ${key.replace("_", " ")}! ${itemData.effect || `You now have more ${key.replace("_", " ")}.`}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(buyMessage, threadID, messageID);
      userData.exp += 200;
      await saveMinerData(db, senderID.toString(), userData);
      return;
    }

    if (action === "upgrade") {
      if (Object.keys(userData.equipment.pickaxes).length === 0) {
        const noPickaxe = AuroraBetaStyler.styleOutput({
          headerText: "Mines Upgrade",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need a pickaxe to upgrade! Buy one from /mines shop.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(noPickaxe, threadID, messageID);
        return;
      }
      interface UpgradeCost {
        silverOre: number;
        goldOre?: number;
        diamondOre?: number;
      }
      interface Upgrade {
        cost: UpgradeCost;
        addedLevel: number;
        ability: string;
      }
      const upgradeOptions: { [key: string]: Upgrade } = {
        iron_upgrade: { cost: { silverOre: 100, goldOre: 20 }, addedLevel: 5, ability: "Strengthens your pickaxe" },
        steel_upgrade: { cost: { silverOre: 200, goldOre: 50, diamondOre: 10 }, addedLevel: 10, ability: "Boosts mining efficiency" },
        mythic_upgrade: { cost: { silverOre: 400, goldOre: 100, diamondOre: 50 }, addedLevel: 20, ability: "Unlocks rare ores" },
        diamond_enhancement: { cost: { silverOre: 600, goldOre: 150, diamondOre: 75 }, addedLevel: 15, ability: "Enhances durability" },
        platinum_upgrade: { cost: { silverOre: 800, goldOre: 200, diamondOre: 100 }, addedLevel: 25, ability: "Increases yield by 50%" },
        celestial_forge: { cost: { silverOre: 1200, goldOre: 300, diamondOre: 150 }, addedLevel: 30, ability: "Grants mystical mining power" },
        void_enchantment: { cost: { silverOre: 1500, goldOre: 400, diamondOre: 200 }, addedLevel: 35, ability: "Unlocks void ores" },
        cosmic_refinement: { cost: { silverOre: 2000, goldOre: 500, diamondOre: 250 }, addedLevel: 40, ability: "Boosts yield by 75%" },
        ethereal_blade: { cost: { silverOre: 2500, goldOre: 600, diamondOre: 300 }, addedLevel: 45, ability: "Grants ethereal mining" },
        infinity_core: { cost: { silverOre: 3000, goldOre: 700, diamondOre: 350 }, addedLevel: 50, ability: "Unlocks infinite resources" },
      };

      let upgradeMessage = "Available Upgrades\nCurrent Equipment based on your Inventory:\n";
      let hasUpgrades = false;
      for (const pickaxe in userData.equipment.pickaxes) {
        const currentLevel = userData.equipment.pickaxes[pickaxe];
        console.log(`Checking pickaxe: ${pickaxe}, Level: ${currentLevel}, Resources: silverOre=${userData.materials.silverOre}, goldOre=${userData.materials.goldOre}, diamondOre=${userData.materials.diamondOre}`); // Debug log
        if (currentLevel >= 80 && userData.rank === "S") {
          upgradeMessage += `- ${pickaxe.replace("_", " ")} (Level ${currentLevel})\n  No upgrades available. You have reached max level (80) with S rank!\n`;
          continue;
        }
        const availableUpgrades = Object.entries(upgradeOptions)
          .filter(([key, upgrade]) => {
            const canAfford = userData.materials.silverOre >= upgrade.cost.silverOre &&
                            (!upgrade.cost.goldOre || userData.materials.goldOre >= upgrade.cost.goldOre) &&
                            (!upgrade.cost.diamondOre || userData.materials.diamondOre >= upgrade.cost.diamondOre);
            const newLevel = currentLevel + upgrade.addedLevel;
            console.log(`Upgrade: ${key}, CanAfford: ${canAfford}, NewLevel: ${newLevel}, MaxLevelCheck: ${newLevel <= 80}`); // Debug log
            return canAfford && newLevel <= 80;
          })
          .map(([key, upgrade]) => {  // Fixed here with '=>'
            hasUpgrades = true;
            const costStr = Object.entries(upgrade.cost)
              .map(([resource, amount]) => `${amount} ${resource}`)
              .join(" and ");
            return `- ${key.replace("_", " ")}: ${upgrade.ability} (Cost: ${costStr}, Adds: ${upgrade.addedLevel} levels)`;
          });
        upgradeMessage += `- ${pickaxe.replace("_", " ")} (Level ${currentLevel})\n${availableUpgrades.join("\n") || "No upgrades available with current resources."}\n`;
      }
      if (!hasUpgrades && upgradeMessage === "Available Upgrades\nCurrent Equipment based on your Inventory:\n") {
        upgradeMessage += "No upgrades available. Gather more resources or check your pickaxe level!";
      }
      upgradeMessage += "\nReply with the pickaxe and upgrade, e.g., obsidian_pickaxe iron_upgrade to upgrade!";

      const upgradePrompt = AuroraBetaStyler.styleOutput({
        headerText: "Mines Upgrade",
        headerSymbol: "🔧",
        headerStyle: "bold",
        bodyText: upgradeMessage,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });

      let sentMessageID;
      await new Promise((resolve, reject) => {
        api.sendMessage(upgradePrompt, threadID, (err, info) => {
          if (err) reject(err);
          else {
            sentMessageID = info.messageID;
            resolve(info);
          }
        }, messageID);
      });

      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      const handleReply = async (ctx) => {
        const { api, event } = ctx;
        const { threadID, messageID } = event;
        const userReply = event.body?.toLowerCase().trim().split(" ");
        if (userReply.length !== 2 || !userData.equipment.pickaxes[userReply[0].replace(" ", "_")]) {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Mines Upgrade",
              headerSymbol: "⚠️",
              headerStyle: "bold",
              bodyText: "Invalid format or pickaxe. Use: <pickaxe> <upgrade> (e.g., obsidian_pickaxe iron_upgrade).",
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            }),
            threadID,
            messageID
          );
          return;
        }

        const currentPickaxe = userReply[0].replace(" ", "_");
        const selectedUpgrade = userReply[1].replace(" ", "_");
        const upgrade = upgradeOptions[selectedUpgrade];
        if (!upgrade) {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Mines Upgrade",
              headerSymbol: "❌",
              headerStyle: "bold",
              bodyText: "Invalid upgrade choice.",
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            }),
            threadID,
            messageID
          );
          return;
        }

        const currentLevel = userData.equipment.pickaxes[currentPickaxe];
        if (currentLevel >= 80) {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Mines Upgrade",
              headerSymbol: "⚠️",
              headerStyle: "bold",
              bodyText: `${currentPickaxe.replace("_", " ")} is at max level (80)!`,
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            }),
            threadID,
            messageID
          );
          return;
        }

        if (userData.materials.silverOre < upgrade.cost.silverOre ||
            (upgrade.cost.goldOre && userData.materials.goldOre < upgrade.cost.goldOre) ||
            (upgrade.cost.diamondOre && userData.materials.diamondOre < upgrade.cost.diamondOre)) {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Mines Upgrade",
              headerSymbol: "❌",
              headerStyle: "bold",
              bodyText: "You don't have enough resources to upgrade!",
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            }),
            threadID,
            messageID
          );
          return;
        }

        userData.materials.silverOre -= upgrade.cost.silverOre;
        if (upgrade.cost.goldOre) userData.materials.goldOre -= upgrade.cost.goldOre;
        if (upgrade.cost.diamondOre) userData.materials.diamondOre -= upgrade.cost.diamondOre;
        userData.equipment.pickaxes[currentPickaxe] += upgrade.addedLevel;
        await saveMinerData(db, senderID.toString(), userData);

        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Mines Upgrade",
            headerSymbol: "✅",
            headerStyle: "bold",
            bodyText: `Upgraded ${currentPickaxe.replace("_", " ")} to Level ${userData.equipment.pickaxes[currentPickaxe]}! ${upgrade.ability} (x${getCollectionMultiplier(userData.equipment.pickaxes[currentPickaxe], userData.rank)} multiplier).`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          }),
          threadID,
          messageID
        );
      };

      global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
      return;
    }

    if (action === "leaderboard") {
      const minersCollection = db.db("miners");
      const leaderboardData = await minersCollection.find().sort({ exp: -1 }).limit(5).toArray();
      let leaderboardMessage = "Available Leaderboard\nCurrent Top Miners based on your Server:\n";
      leaderboardData.forEach((miner) => {
        leaderboardMessage += `- ${miner.name || `User ${miner.userID}`}\n- Rank: ${determineRank(miner.exp)}, EXP: ${miner.exp}\n`;
      });
      leaderboardMessage += "\nNo further actions required for this command!";

      const leaderboardPrompt = AuroraBetaStyler.styleOutput({
        headerText: "Mines Leaderboard",
        headerSymbol: "🏆",
        headerStyle: "bold",
        bodyText: leaderboardMessage,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });

      await api.sendMessage(leaderboardPrompt, threadID, messageID);
      userData.exp += 200;
      await saveMinerData(db, senderID.toString(), userData);
      return;
    }

    const helpMessage = AuroraBetaStyler.styleOutput({
      headerText: "Mines Help",
      headerSymbol: "ℹ️",
      headerStyle: "bold",
      bodyText: "Usage:\n/mines register <name>\n/mines start <name_pickaxe>\n/mines collect\n/mines start switch <name_pickaxe>\n/mines rest\n/mines tournament\n/mines shop\n/mines buy <key>\n/mines upgrade\n/mines leaderboard",
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel",
    });
    await api.sendMessage(helpMessage, threadID, messageID);
  },
};

export default minesCommand;
