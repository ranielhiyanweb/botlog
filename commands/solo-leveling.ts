/* Ill keep updating for this cmd sometimes if i have a free time : ) */
import AuroraBetaStyler from "../core/plugin/aurora-beta-styler";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
    };
    run: (context: { api: any; event: any; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

interface HunterData {
  userID: string;
  name?: string;
  level: number;
  exp: number;
  rank: string;
  role?: string;
  equipment: { swords: { [key: string]: number } };
  inventory: { potions: { [key: string]: number }; materials: { [key: string]: number } };
  shadows: { name: string; nickname: string; level?: number }[];
  stats: { strength: number; agility: number; mana: number };
  dungeonCooldown: number;
  quests: { [key: string]: { goal: number; progress: number; reward: number; completed: boolean; timestamp?: number; target?: string } };
  guild?: string;
  meditateCooldown: number;
  lostShadows?: { name: string; nickname: string }[];
  hasChangedName?: boolean;
  gateCooldown?: number; 
}

interface GuildData {
  name: string;
  members: string[];
  totalStrength: number;
  hasChangedName?: boolean; 
}

const soloLevelingCommand: ShadowBot.Command = {
  config: {
    name: "solo-leveling",
    description: "Embark on a Solo Leveling adventure as a hunter!",
    usage: "/solo-leveling register <name> | /sl status | /sl battle | /sl battle X | /sl shop | /sl buy <item> <quantity> | /sl use <potion> <quantity> | /sl dungeon <tier> | /sl train <stat> | /sl quest | /sl guild [create <name> | join <guild name> | fight <guild name> | list | changename <new name>] | /sl leaderboard | /sl meditate | /sl shadowlist | /sl setrole <class> | /sl changename <newname> | /sl gate enter <class>",
    aliases: ["sl"],
    category: "Games 🎮",
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage("Database not available.", event.threadID, event.messageID);
      return;
    }
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const userData = await getHunterData(db, senderID.toString());
    const currentTime = Math.floor(Date.now() / 1000);
    const dungeonCooldown = 3600;
    const meditateCooldown = 1800;
    const gateCooldown = 1800; 

    if (action === "register") {
      const name = args[1];
      if (!name) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a hunter name. Usage: /sl register <name>",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(errorMessage, threadID, messageID);
        return;
      }
      const huntersCollection = db.db("hunters");
      const existingHunter = await huntersCollection.findOne({ name: name });
      if (existingHunter) {
        const duplicateName = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `The name "${name}" is already taken. Please choose a different name.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(duplicateName, threadID, messageID);
        return;
      }
      if (userData.name) {
        const alreadyRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `You are already registered as ${userData.name}. Use /sl status to check your stats.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(alreadyRegistered, threadID, messageID);
        return;
      }
      userData.name = name;
      userData.level = 1;
      userData.exp = 0;
      userData.rank = "E";
      userData.equipment.swords = { "basic_sword": 1 };
      userData.inventory = { potions: { "health_potion": 2 }, materials: {} };
      userData.shadows = [];
      userData.stats = { strength: 10, agility: 10, mana: 10 };
      userData.dungeonCooldown = 0;
      userData.quests = {};
      userData.meditateCooldown = 0;
      userData.lostShadows = [];
      userData.hasChangedName = false;
      userData.gateCooldown = 0; 
      await saveHunterData(db, senderID.toString(), userData);
      const registerMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `${name} registered as a hunter! Default rank: E. Use /sl status to see your stats.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(registerMessage, threadID, messageID);
      return;
    }

    if (!userData.name) {
      const notRegistered = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "You need to register first. Usage: /sl register <name>",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(notRegistered, threadID, messageID);
      return;
    }

    if (action === "status") {
      const equippedSword = Object.entries(userData.equipment.swords).reduce((max, current) => (current[1] > max[1] ? current : max), ["basic_sword", 1]);
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      const statusMessage = AuroraBetaStyler.styleOutput({
        headerText: "Hunter Status",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: `Name: ${userData.name}\nLevel: ${Math.max(1, Number(userData.level) || 1)}\nEXP: ${Math.max(0, Number(userData.exp) || 0)}\nRank: ${userData.rank || "E"}\nRole: ${userData.role || "None"}\nStats: Strength ${Math.max(0, Number(stats.strength) || 0)}, Agility ${Math.max(0, Number(stats.agility) || 0)}, Mana ${Math.max(0, Number(stats.mana) || 0)}\nEquipped Sword: ${equippedSword[0].replace("_", " ")} (Level ${Math.max(1, Number(equippedSword[1]) || 1)})\nShadows: ${userData.shadows.length > 0 ? userData.shadows.map(s => `${s.name} (${s.nickname})`).join(", ") : "None"}\nGuild: ${userData.guild || "None"}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(statusMessage, threadID, messageID);
      return;
    }

    if (action === "battle") {
      if (args[1]?.toLowerCase() === "x") {
        if (userData.rank !== "X") {
          const restrictedMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Battle X",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: "Only X rank hunters can use /sl battle X!",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(restrictedMessage, threadID, messageID);
          return;
        }
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const expGain = Math.max(0, Math.floor(Math.random() * 10000) + 5000);
        const enemy = "Supreme Monarch"; // Exclusive to X-rank battle
        userData.exp += expGain;
        userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
        let battleXMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Battle X",
          headerSymbol: "🌑",
          headerStyle: "bold",
          bodyText: `X Rank Supremacy! Defeated ${enemy} instantly by ${userData.name}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Reply with 'arise ${enemy} <nickname>' to awaken this Shadow Monarch!`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        let sentMessageID;
        await new Promise((resolve) => {
          api.sendMessage(battleXMessage, threadID, (err, info) => {
            if (err) resolve(err);
            else {
              sentMessageID = info.messageID;
              resolve(info);
            }
          }, messageID);
        });

        if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
        const handleReply = async ({ api, event }) => {
          const { body } = event;
          const reply = body.toLowerCase().trim().split(" ");
          if (reply[0] === "arise" && reply[1]?.replace(/_/g, " ").toLowerCase() === "supreme monarch") {
            const nickname = reply.slice(2).join(" ") || "SupremeShadow";
            userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + 1000;
            userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + 1000;
            userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + 2000;
            userData.shadows.push({ name: "Supreme Monarch", nickname, level: 1 });
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: "Solo Leveling Arise",
                headerSymbol: "🌑",
                headerStyle: "bold",
                bodyText: `Awakened Supreme Monarch as ${nickname}! Gain +1000 Strength, +1000 Agility, +2000 Mana.`,
                bodyStyle: "bold",
                footerText: "Modefied by: Raniel",
              }),
              threadID,
              event.messageID
            );
          }
        };
        global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
        await saveHunterData(db, senderID.toString(), userData);
        return;
      }

      if (userData.rank !== "X" && Math.random() < 0.4) {
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const userStrength = Math.max(1, Number(stats.strength) || 10);
        const normalEnemies = [
          "Kang Taeshik", "Kim Chul", "Yoo Jinho", "Lee Joohee", "Park Heejin",
          "Cha Hae-In", "Baek Yoonho", "Choi Jong-In", "Maharaga", "Igris",
          "Beru", "Tusk", "Baruka", "Cerberus", "Blood-Red Commander Igris",
          "High Orc", "Ice Bear", "Frost Giant", "Flame Bear"
        ];
        const shadowMonarchs = ["Kamish", "Ant King", "Monarch of Destruction", "Ruler's Shadow", "Ashborn", "Supreme Monarch", "Jun hee"];
        const allEnemies = userData.rank === "S" ? [...normalEnemies, ...shadowMonarchs] : normalEnemies;
        const enemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
        const isMonarch = shadowMonarchs.includes(enemy);
        const enemyStrengthBase = isMonarch ? 200 : 50;
        const enemyStrength = Math.max(1, Math.floor(Math.random() * enemyStrengthBase * 0.4) + (userStrength * 0.67));
        let battleResult = userData.inventory.potions["god_mode_potion"] && userData.inventory.potions["god_mode_potion"] > 0 ? true : userStrength > enemyStrength;
        let expGain = Math.max(0, Math.floor(Math.random() * (isMonarch ? 1000 : 500)) + (isMonarch ? 500 : 100));
        userData.exp = Math.max(0, Number(userData.exp) || 0) + expGain;

        if (userData.exp >= 1000 && userData.rank === "E") {
          userData.rank = "D";
          applyRoleSkills(userData);
        } else if (userData.exp >= 2500 && userData.rank === "D") {
          userData.rank = "C";
          applyRoleSkills(userData);
        } else if (userData.exp >= 5000 && userData.rank === "C") {
          userData.rank = "B";
          applyRoleSkills(userData);
        } else if (userData.exp >= 10000 && userData.rank === "B") {
          userData.rank = "A";
          applyRoleSkills(userData);
        } else if (userData.exp >= 30000 && userData.rank === "A") {
          userData.rank = "S";
          applyRoleSkills(userData);
        } else if (userData.exp >= 2000000000 && userData.rank === "S" && stats.strength >= 1000 && stats.agility >= 1000 && stats.mana >= 10000) {
          userData.rank = "X";
          applyRoleSkills(userData);
          userData.shadows.push({ name: "Sung Jin-Woo", nickname: "Shadow Monarch", level: 1 });
          userData.stats.strength += 10000;
          userData.stats.agility += 10000;
          userData.stats.mana += 20000;
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Achievement",
              headerSymbol: "🌑",
              headerStyle: "bold",
              bodyText: `Congratulations ${userData.name}! You’ve reached X Rank! Sung Jin-Woo has arisen with +10k Strength, +10k Agility, +20k Mana!`,
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            }),
            threadID,
            messageID
          );
        }
        userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);

        if (battleResult) {
          if (userData.inventory.potions["god_mode_potion"] && userData.inventory.potions["god_mode_potion"] > 0) {
            userData.inventory.potions["god_mode_potion"] -= 1;
            if (userData.inventory.potions["god_mode_potion"] <= 0) delete userData.inventory.potions["god_mode_potion"];
            expGain = Math.max(0, Math.floor(Math.random() * 10000) + 5000);
            const godModeMessage = AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Battle",
              headerSymbol: "✨",
              headerStyle: "bold",
              bodyText: `God Mode Activated! All enemies defeated instantly by ${userData.name}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            });
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(godModeMessage, threadID, messageID);
            return;
          }
          let battleMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Battle",
            headerSymbol: "⚔️",
            headerStyle: "bold",
            bodyText: `Victory! You defeated ${enemy} with strength ${userStrength} vs ${enemyStrength}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });

          if (userData.rank === "S" && isMonarch) {
            battleMessage = AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Battle",
              headerSymbol: "⚔️",
              headerStyle: "bold",
              bodyText: `Victory! You defeated ${enemy} with strength ${userStrength} vs ${enemyStrength}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Reply with 'arise ${enemy} <nickname>' to awaken this Shadow Monarch!`,
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            });
            let sentMessageID;
            await new Promise((resolve) => {
              api.sendMessage(battleMessage, threadID, (err, info) => {
                if (err) resolve(err);
                else {
                  sentMessageID = info.messageID;
                  resolve(info);
                }
              }, messageID);
            });

            if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
            const handleReply = async ({ api, event }) => {
              const { body } = event;
              const reply = body.toLowerCase().trim().split(" ");
              if (reply[0] === "arise") {
                const inputEnemy = reply[1]?.replace(/_/g, " ");
                const normalizedEnemy = shadowMonarchs.find(m => m.toLowerCase() === inputEnemy);
                if (normalizedEnemy) {
                  const nickname = reply.slice(2).join(" ") || `${normalizedEnemy.toLowerCase()}Shadow`;
                  const statBoosts = {
                    "Kamish": { strength: 100, agility: 50, mana: 200 },
                    "Ant King": { strength: 150, mana: 200 },
                    "Monarch of Destruction": { agility: 100, mana: 300 },
                    "Ruler's Shadow": { strength: 200, agility: 50 },
                    "Ashborn": { strength: 500, agility: 500, mana: 1000 }
                  };
                  const boosts = statBoosts[normalizedEnemy] || { strength: 20, agility: 20, mana: 20 };
                  userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + boosts.strength;
                  userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + boosts.agility;
                  userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + boosts.mana;
                  userData.shadows.push({ name: normalizedEnemy, nickname, level: 1 });
                  await saveHunterData(db, senderID.toString(), userData);
                  await api.sendMessage(
                    AuroraBetaStyler.styleOutput({
                      headerText: "Solo Leveling Arise",
                      headerSymbol: "🌑",
                      headerStyle: "bold",
                      bodyText: `Awakened ${normalizedEnemy} as ${nickname}! Gain ${boosts.strength} Strength, ${boosts.agility} Agility, ${boosts.mana} Mana.`,
                      bodyStyle: "bold",
                      footerText: "Modefied by: Raniel",
                    }),
                    threadID,
                    event.messageID
                  );
                }
              }
            };

            global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
          } else {
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(battleMessage, threadID, messageID);
          }
        } else {
          const battleMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Battle",
            headerSymbol: "💥",
            headerStyle: "bold",
            bodyText: `Defeated by ${enemy} (strength ${enemyStrength} vs ${userStrength}). Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Train harder!`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await saveHunterData(db, senderID.toString(), userData);
          await api.sendMessage(battleMessage, threadID, messageID);
        }
      } else if (userData.rank === "X") {
        const expGain = Math.max(0, Math.floor(Math.random() * 5000) + 2000);
        userData.exp += expGain;
        const battleMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Battle",
          headerSymbol: "⚔️",
          headerStyle: "bold",
          bodyText: `X Rank Dominance! All enemies defeated instantly! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await saveHunterData(db, senderID.toString(), userData);
        await api.sendMessage(battleMessage, threadID, messageID);
      } else if (userData.rank !== "X" && Math.random() >= 0.4) {
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        userData.exp += 100; // Gain 100 EXP
        stats.agility = Math.max(0, Number(stats.agility) || 0) + 100; // Gain 100 Agility
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 100; // Gain 100 Mana
        userData.stats = stats;
        userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
        const noEncounterMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Battle",
          headerSymbol: "ℹ️",
          headerStyle: "bold",
          bodyText: "No enemies encountered this time. Gained 100 EXP, 100 Agility, and 100 Mana! New Level: " + userData.level,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await saveHunterData(db, senderID.toString(), userData);
        await api.sendMessage(noEncounterMessage, threadID, messageID);
      }
      return;
    }

    if (action === "dungeon") {
      const subAction = args[1]?.toLowerCase();
      if (subAction === "status") {
        const remaining = Math.max(0, Number(userData.dungeonCooldown) || 0) > currentTime ? Math.ceil((Math.max(0, Number(userData.dungeonCooldown) || 0) - currentTime) / 60) : 0;
        const statusMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon Status",
          headerSymbol: "🏰",
          headerStyle: "bold",
          bodyText: `Last Tier: ${userData.rank || "E"}\nCooldown: ${remaining} mins\nMaterials: ${Object.entries(userData.inventory.materials || {}).map(([k, v]) => `${k} x${Math.max(0, Number(v) || 0)}`).join(", ") || "None"}`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(statusMessage, threadID, messageID);
        return;
      }
      const tier = subAction?.toUpperCase();
      const tiers = ["D", "C", "B", "A", "S"];
      if (!tier || !tiers.includes(tier)) {
        const invalidTier = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid tier. Use /sl dungeon <tier> (D, C, B, A, S).",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidTier, threadID, messageID);
        return;
      }
      if (Math.max(0, Number(userData.dungeonCooldown) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.dungeonCooldown) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }

      if (userData.rank !== "X" && Math.random() < 0.4) {
        const normalEnemies = {
          D: ["Kang Taeshik", "Kim Chul"],
          C: ["Igris", "Cerberus"],
          B: ["Ice Bear", "Frost Giant"],
          A: ["High Orc", "Flame Bear"],
          S: ["Blood-Red Commander Igris", "Tusk"]
        };
        const finalBosses = { A: "High Orc Chief", S: "Ashborn" };
        const tierEnemies = normalEnemies[tier];
        const enemy = Math.random() < 0.7 || !finalBosses[tier] ? tierEnemies[Math.floor(Math.random() * tierEnemies.length)] : finalBosses[tier];
        const isBoss = finalBosses[tier] === enemy;
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const userStrength = Math.max(1, Number(stats.strength) || 10);
        const enemyStrength = Math.max(1, Math.floor(Math.random() * (isBoss ? 300 : 100) * 0.4) + (userStrength * 0.67));
        let battleResult = userData.inventory.potions["god_mode_potion"] && userData.inventory.potions["god_mode_potion"] > 0 ? true : userStrength > enemyStrength;
        let expGain = Math.max(0, Math.floor(Math.random() * (isBoss ? 500 : 200)) + (isBoss ? 700 : 100) + (tier === "D" ? 0 : tier === "C" ? 100 : tier === "B" ? 300 : tier === "A" ? 500 : 800));
        let drop = "";

        if (battleResult) {
          if (userData.inventory.potions["god_mode_potion"] && userData.inventory.potions["god_mode_potion"] > 0) {
            userData.inventory.potions["god_mode_potion"] -= 1;
            if (userData.inventory.potions["god_mode_potion"] <= 0) delete userData.inventory.potions["god_mode_potion"];
            expGain = Math.max(0, Math.floor(Math.random() * 10000) + 5000);
            const godModeMessage = AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Dungeon",
              headerSymbol: "✨",
              headerStyle: "bold",
              bodyText: `God Mode Activated! All enemies in ${tier}-tier dungeon defeated instantly by ${userData.name}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
              bodyStyle: "bold",
              footerText: "Modefied by: Raniel",
            });
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(godModeMessage, threadID, messageID);
            return;
          }
          userData.exp = Math.max(0, Number(userData.exp) || 0) + expGain;
          if (isBoss && tier === "A") {
            userData.inventory.materials = userData.inventory.materials || {};
            userData.inventory.materials["Orc Horn"] = Math.max(0, Number(userData.inventory.materials["Orc Horn"] || 0) + 1);
            drop = "Found Orc Horn!";
          } else if (isBoss && tier === "S") {
            if (Math.random() < 0.3 && userData.rank === "S") {
              drop = "Chance to awaken Ashborn!";
            }
          }

          if (userData.exp >= 1000 && userData.rank === "E") {
            userData.rank = "D";
            applyRoleSkills(userData);
          } else if (userData.exp >= 2500 && userData.rank === "D") {
            userData.rank = "C";
            applyRoleSkills(userData);
          } else if (userData.exp >= 5000 && userData.rank === "C") {
            userData.rank = "B";
            applyRoleSkills(userData);
          } else if (userData.exp >= 10000 && userData.rank === "B") {
            userData.rank = "A";
            applyRoleSkills(userData);
          } else if (userData.exp >= 30000 && userData.rank === "A") {
            userData.rank = "S";
            applyRoleSkills(userData);
          } else if (userData.exp >= 2000000000 && userData.rank === "S" && stats.strength >= 1000 && stats.agility >= 1000 && stats.mana >= 10000) {
            userData.rank = "X";
            applyRoleSkills(userData);
            userData.shadows.push({ name: "Sung Jin-Woo", nickname: "Shadow Monarch", level: 1 });
            userData.stats.strength += 10000;
            userData.stats.agility += 10000;
            userData.stats.mana += 20000;
            await api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: "Solo Leveling Achievement",
                headerSymbol: "🌑",
                headerStyle: "bold",
                bodyText: `Congratulations ${userData.name}! You’ve reached X Rank! Sung Jin-Woo has arisen with +10k Strength, +10k Agility, +20k Mana!`,
                bodyStyle: "bold",
                footerText: "Modefied by: Raniel",
              }),
              threadID,
              messageID
            );
          }
          userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
          userData.dungeonCooldown = currentTime + dungeonCooldown;

          const dungeonMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Dungeon",
            headerSymbol: "🏰",
            headerStyle: "bold",
            bodyText: `You entered a ${tier}-tier dungeon! Victory! You defeated ${enemy} with strength ${userStrength} vs ${enemyStrength}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. ${drop}`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await saveHunterData(db, senderID.toString(), userData);
          await api.sendMessage(dungeonMessage, threadID, messageID);

          if (drop.includes("awaken") && userData.rank === "S") {
            let sentMessageID;
            await new Promise((resolve) => {
              api.sendMessage(
                AuroraBetaStyler.styleOutput({
                  headerText: "Solo Leveling Dungeon",
                  headerSymbol: "🌑",
                  headerStyle: "bold",
                  bodyText: `Defeated Ashborn! Reply with 'arise Ashborn <nickname>' to awaken this Shadow Monarch!`,
                  bodyStyle: "bold",
                  footerText: "Modefied by: Raniel",
                }),
                threadID,
                (err, info) => {
                  if (err) resolve(err);
                  else {
                    sentMessageID = info.messageID;
                    resolve(info);
                  }
                }
              );
            });

            if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
            const handleReply = async ({ api, event }) => {
              const { body } = event;
              const reply = body.toLowerCase().trim().split(" ");
              if (reply[0] === "arise" && reply[1] === "ashborn") {
                const nickname = reply.slice(2).join(" ") || "ashbornShadow";
                const statBoosts = { "Ashborn": { strength: 500, agility: 500, mana: 1000 } };
                const boosts = statBoosts["Ashborn"];
                userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + boosts.strength;
                userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + boosts.agility;
                userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + boosts.mana;
                userData.shadows.push({ name: "Ashborn", nickname, level: 1 });
                await saveHunterData(db, senderID.toString(), userData);
                await api.sendMessage(
                  AuroraBetaStyler.styleOutput({
                    headerText: "Solo Leveling Arise",
                    headerSymbol: "🌑",
                    headerStyle: "bold",
                    bodyText: `Awakened Ashborn as ${nickname}! Gain ${boosts.strength} Strength, ${boosts.agility} Agility, ${boosts.mana} Mana.`,
                    bodyStyle: "bold",
                    footerText: "Modefied by: Raniel",
                  }),
                  threadID,
                  event.messageID
                );
              }
            };

            global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
          }
        } else {
          userData.dungeonCooldown = currentTime + dungeonCooldown;
          if (!battleResult && Math.random() < 0.2 && userData.shadows.length > 0) {
            const lostShadow = userData.shadows.splice(Math.floor(Math.random() * userData.shadows.length), 1)[0];
            userData.lostShadows = userData.lostShadows || [];
            userData.lostShadows.push(lostShadow);
          }
          const dungeonMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Dungeon",
            headerSymbol: "💥",
            headerStyle: "bold",
            bodyText: `You entered a ${tier}-tier dungeon! Defeated by ${enemy} (strength ${enemyStrength} vs ${userStrength}). Gained 0 EXP. ${userData.lostShadows?.length > 0 ? "Lost a shadow!" : "Train harder!"}`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await saveHunterData(db, senderID.toString(), userData);
          await api.sendMessage(dungeonMessage, threadID, messageID);
        }
      } else if (userData.rank === "X") {
        const expGain = Math.max(0, Math.floor(Math.random() * 10000) + 5000);
        userData.exp += expGain;
        userData.dungeonCooldown = currentTime + dungeonCooldown;
        const dungeonMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon",
          headerSymbol: "🏰",
          headerStyle: "bold",
          bodyText: `X Rank Dominance! All enemies in ${tier}-tier dungeon defeated instantly! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await saveHunterData(db, senderID.toString(), userData);
        await api.sendMessage(dungeonMessage, threadID, messageID);
      }
      return;
    }

    if (action === "gate") {
      const subAction = args[1]?.toLowerCase();
      if (subAction !== "enter") {
        const invalidGate = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Gate",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid command. Use /sl gate enter <blue/red/violet/orange>.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidGate, threadID, messageID);
        return;
      }
      const gateClass = args[2]?.toLowerCase();
      const validClasses = ["blue", "red", "violet", "orange"];
      if (!gateClass || !validClasses.includes(gateClass)) {
        const invalidClass = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Gate",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid gate class. Use /sl gate enter <blue/red/violet/orange>.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidClass, threadID, messageID);
        return;
      }
      if (Math.max(0, Number(userData.gateCooldown) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.gateCooldown) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Gate",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      const expGain = 3000;
      userData.exp = Math.max(0, Number(userData.exp) || 0) + expGain;
      userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
      userData.gateCooldown = currentTime + gateCooldown;
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      if (userData.exp >= 1000 && userData.rank === "E") {
        userData.rank = "D";
        applyRoleSkills(userData);
      } else if (userData.exp >= 2500 && userData.rank === "D") {
        userData.rank = "C";
        applyRoleSkills(userData);
      } else if (userData.exp >= 5000 && userData.rank === "C") {
        userData.rank = "B";
        applyRoleSkills(userData);
      } else if (userData.exp >= 10000 && userData.rank === "B") {
        userData.rank = "A";
        applyRoleSkills(userData);
      } else if (userData.exp >= 30000 && userData.rank === "A") {
        userData.rank = "S";
        applyRoleSkills(userData);
      } else if (userData.exp >= 2000000000 && userData.rank === "S" && stats.strength >= 1000 && stats.agility >= 1000 && stats.mana >= 10000) {
        userData.rank = "X";
        applyRoleSkills(userData);
        userData.shadows.push({ name: "Sung Jin-Woo", nickname: " Jad Monarch", level: 1 });
        userData.stats.strength += 10000;
        userData.stats.agility += 10000;
        userData.stats.mana += 20000;
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Achievement",
            headerSymbol: "🌑",
            headerStyle: "bold",
            bodyText: `Congratulations ${userData.name}! You’ve reached X Rank! Sung Jin-Woo has arisen with +10k Strength, +10k Agility, +20k Mana!`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          }),
          threadID,
          messageID
        );
      }

      await saveHunterData(db, senderID.toString(), userData);
      const gateMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Gate",
        headerSymbol: "🚪",
        headerStyle: "bold",
        bodyText: `You entered a ${gateClass} gate! Successfully cleared! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(gateMessage, threadID, messageID);
      return;
    }

    if (action === "shop") {
      interface ShopItem {
        cost: { exp: number };
        type: "sword" | "potion";
        level?: number;
        effect?: string;
        amount?: number;
        limit?: number;
      }
      const shopItems: { [key: string]: ShopItem } = {
        basic_sword: { cost: { exp: 0 }, type: "sword", level: 1, effect: "Basic damage" },
        demon_kings_longsword: { cost: { exp: 1000 }, type: "sword", level: 2, effect: "Increases damage by 30%" },
        knights_tyrant_blade: { cost: { exp: 2500 }, type: "sword", level: 3, effect: "Increases damage by 50%" },
        storcs_bane: { cost: { exp: 5000 }, type: "sword", level: 4, effect: "Increases damage by 70%" },
        kasaka_s_venom_fang: { cost: { exp: 7500 }, type: "sword", level: 5, effect: "Adds poison effect" },
        ice_dagger: { cost: { exp: 3000 }, type: "sword", level: 3, effect: "Freezes enemies, +40% damage" },
        shadow_scythe: { cost: { exp: 8000 }, type: "sword", level: 5, effect: "Dark damage, +60% damage" },
        crimson_blade: { cost: { exp: 9000 }, type: "sword", level: 6, effect: "Burns enemies, +70% damage" },
        thunder_spear: { cost: { exp: 10000 }, type: "sword", level: 6, effect: "Lightning strike, +70% damage" },
        frostbite_axe: { cost: { exp: 11000 }, type: "sword", level: 7, effect: "Slows enemies, +80% damage" },
        arcane_sword: { cost: { exp: 12000 }, type: "sword", level: 7, effect: "Mana boost, +80% damage" },
        dragon_tooth_sword: { cost: { exp: 13000 }, type: "sword", level: 8, effect: "Dragon fire, +90% damage" },
        void_edge: { cost: { exp: 14000 }, type: "sword", level: 8, effect: "Void damage, +90% damage" },
        celestial_blade: { cost: { exp: 15000 }, type: "sword", level: 9, effect: "Holy damage, +100% damage" },
        ashborn_s_relic: { cost: { exp: 20000 }, type: "sword", level: 10, effect: "Ultimate power, +150% damage" },
        x_rank_sword: { cost: { exp: 5000000 }, type: "sword", level: 15, effect: "+10k Strength, +10k Agility, +40k Mana" },
        health_potion: { cost: { exp: 200 }, type: "potion", amount: 1, effect: "Restores 50 HP" },
        mana_potion: { cost: { exp: 300 }, type: "potion", amount: 1, effect: "Restores 30 Mana" },
        strength_potion: { cost: { exp: 500 }, type: "potion", amount: 1, effect: "Boosts Strength by 20" },
        agility_potion: { cost: { exp: 600 }, type: "potion", amount: 1, effect: "Boosts Agility by 20" },
        mana_regen_potion: { cost: { exp: 700 }, type: "potion", amount: 1, effect: "Restores 50 Mana over time" },
        god_mode_potion: { cost: { exp: 1000000 }, type: "potion", amount: 1, limit: 5, effect: "Defeats all enemies instantly for 1 battle" },
          
      };
      const shopMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Shop",
        headerSymbol: "🛍️",
        headerStyle: "bold",
        bodyText: Object.entries(shopItems).map(([key, details]) => {
          const costStr = `${details.cost.exp} EXP`;
          const displayText = details.effect ? `${details.effect}` : `Get ${details.amount || 0} ${key.replace("_", " ")}`;
          return `- ${key.replace("_", " ")}: ${displayText} (Cost: ${costStr}${details.limit ? `, Limit: ${details.limit}` : ""})`;
        }).join("\n") + "\nUse /sl buy <item> <quantity> to purchase.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(shopMessage, threadID, messageID);
      return;
    }

    if (action === "buy") {
      interface ShopItem {
        cost: { exp: number };
        type: "sword" | "potion";
        level?: number;
        effect?: string;
        amount?: number;
        limit?: number;
      }
      const shopItems: { [key: string]: ShopItem } = {
        basic_sword: { cost: { exp: 0 }, type: "sword", level: 1, effect: "Basic damage" },
        demon_kings_longsword: { cost: { exp: 1000 }, type: "sword", level: 2, effect: "Increases damage by 30%" },
        knights_tyrant_blade: { cost: { exp: 2500 }, type: "sword", level: 3, effect: "Increases damage by 50%" },
        storcs_bane: { cost: { exp: 5000 }, type: "sword", level: 4, effect: "Increases damage by 70%" },
        kasaka_s_venom_fang: { cost: { exp: 7500 }, type: "sword", level: 5, effect: "Adds poison effect" },
        ice_dagger: { cost: { exp: 3000 }, type: "sword", level: 3, effect: "Freezes enemies, +40% damage" },
        shadow_scythe: { cost: { exp: 8000 }, type: "sword", level: 5, effect: "Dark damage, +60% damage" },
        crimson_blade: { cost: { exp: 9000 }, type: "sword", level: 6, effect: "Burns enemies, +70% damage" },
        thunder_spear: { cost: { exp: 10000 }, type: "sword", level: 6, effect: "Lightning strike, +70% damage" },
        frostbite_axe: { cost: { exp: 11000 }, type: "sword", level: 7, effect: "Slows enemies, +80% damage" },
        arcane_sword: { cost: { exp: 12000 }, type: "sword", level: 7, effect: "Mana boost, +80% damage" },
        dragon_tooth_sword: { cost: { exp: 13000 }, type: "sword", level: 8, effect: "Dragon fire, +90% damage" },
        void_edge: { cost: { exp: 14000 }, type: "sword", level: 8, effect: "Void damage, +90% damage" },
        celestial_blade: { cost: { exp: 15000 }, type: "sword", level: 9, effect: "Holy damage, +100% damage" },
        ashborn_s_relic: { cost: { exp: 20000 }, type: "sword", level: 10, effect: "Ultimate power, +150% damage" },
        x_rank_sword: { cost: { exp: 5000000 }, type: "sword", level: 15, effect: "+10k Strength, +10k Agility, +40k Mana" },
        health_potion: { cost: { exp: 200 }, type: "potion", amount: 1, effect: "Restores 50 HP" },
        mana_potion: { cost: { exp: 300 }, type: "potion", amount: 1, effect: "Restores 30 Mana" },
        strength_potion: { cost: { exp: 500 }, type: "potion", amount: 1, effect: "Boosts Strength by 20" },
        agility_potion: { cost: { exp: 600 }, type: "potion", amount: 1, effect: "Boosts Agility by 20" },
        mana_regen_potion: { cost: { exp: 700 }, type: "potion", amount: 1, effect: "Restores 50 Mana over time" },
        god_mode_potion: { cost: { exp: 1000000 }, type: "potion", amount: 1, limit: 5, effect: "Defeats all enemies instantly for 1 battle" },
      };
      const key = args[1]?.toLowerCase();
      const quantity = parseInt(args[2]) || 1;
      if (!key || !shopItems[key] || quantity <= 0) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Shop",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid item or quantity. Use /sl shop to see available items, then /sl buy <item> <quantity>.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      const itemData = shopItems[key];
      const totalCost = itemData.cost.exp * quantity;
      userData.exp = Math.max(0, Number(userData.exp) || 0);
      if (userData.exp < totalCost) {
        const insufficientMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Shop",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `You don't have enough EXP (${totalCost} needed) to buy ${quantity} ${key.replace("_", " ")}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(insufficientMessage, threadID, messageID);
        return;
      }
      if (itemData.limit && (userData.inventory.potions[key] || 0) + quantity > itemData.limit) {
        const limitMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Shop",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `Limit reached for ${key.replace("_", " ")}. Max: ${itemData.limit}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(limitMessage, threadID, messageID);
        return;
      }
      userData.exp -= totalCost;
      if (itemData.type === "sword") {
        userData.equipment.swords[key] = Math.max(1, Number(itemData.level) || 1) * quantity;
      } else if (itemData.type === "potion") {
        userData.inventory.potions[key] = Math.max(0, Number(userData.inventory.potions[key] || 0) + (itemData.amount || 0) * quantity);
      }
      await saveHunterData(db, senderID.toString(), userData);
      const buyMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Shop",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Purchased ${quantity} ${key.replace("_", " ")}! ${itemData.effect || "Added to inventory."} (Cost: ${totalCost} EXP)`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(buyMessage, threadID, messageID);
      return;
    }

    if (action === "use") {
      const potion = args[1]?.toLowerCase();
      const quantity = parseInt(args[2]) || 1;
      if (!potion || !userData.inventory.potions[potion] || quantity <= 0 || userData.inventory.potions[potion] < quantity) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Use",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Invalid potion, insufficient quantity, or not enough potions. You have ${userData.inventory.potions[potion] || 0} ${potion?.replace("_", " ") || "potion"}. Check with /sl status.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      userData.inventory.potions[potion] = Math.max(0, Number(userData.inventory.potions[potion]) || 0) - quantity;
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      let effectMessage = "";
      if (potion === "health_potion") {
        stats.strength = Math.max(0, Number(stats.strength) || 0) + 5 * quantity;
        effectMessage = `Used ${quantity} Health Potion(s)! Strength increased by ${5 * quantity} permanently.`;
      } else if (potion === "mana_potion") {
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 5 * quantity;
        effectMessage = `Used ${quantity} Mana Potion(s)! Mana increased by ${5 * quantity} permanently.`;
      } else if (potion === "strength_potion") {
        stats.strength = Math.max(0, Number(stats.strength) || 0) + 20 * quantity;
        effectMessage = `Used ${quantity} Strength Potion(s)! Strength increased by ${20 * quantity} permanently.`;
      } else if (potion === "agility_potion") {
        stats.agility = Math.max(0, Number(stats.agility) || 0) + 20 * quantity;
        effectMessage = `Used ${quantity} Agility Potion(s)! Agility increased by ${20 * quantity} permanently.`;
      } else if (potion === "mana_regen_potion") {
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 50 * quantity;
        effectMessage = `Used ${quantity} Mana Regen Potion(s)! Mana increased by ${50 * quantity} permanently.`;
      } else if (potion === "god_mode_potion") {
        effectMessage = `Used ${quantity} God Mode Potion(s)! All enemies will be defeated instantly in your next ${quantity} battle(s)!`;
      }
      userData.stats = stats;
      if (userData.inventory.potions[potion] <= 0) delete userData.inventory.potions[potion];
      await saveHunterData(db, senderID.toString(), userData);
      const useMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Use",
        headerSymbol: potion === "god_mode_potion" ? "✨" : potion.includes("health") ? "❤️" : potion.includes("mana") ? "🔮" : potion.includes("strength") ? "💪" : potion.includes("agility") ? "🏃" : "🔄",
        headerStyle: "bold",
        bodyText: effectMessage,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(useMessage, threadID, messageID);
      return;
    }

    if (action === "train") {
      const stat = args[1]?.toLowerCase();
      if (!stat || !["strength", "agility", "mana"].includes(stat)) {
        const invalidStat = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Train",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid stat. Use /sl train <strength/agility/mana>.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidStat, threadID, messageID);
        return;
      }
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      const currentStat = Math.max(0, Number(stats[stat]) || 0);
      const cost = Math.floor(currentStat * 100);
      userData.exp = Math.max(0, Number(userData.exp) || 0);
      if (userData.exp < cost || currentStat >= 500) {
        const insufficientMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Train",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `Not enough EXP (${cost} needed) or stat maxed (500) unless X rank.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(insufficientMessage, threadID, messageID);
        return;
      }
      userData.exp -= cost;
      stats[stat] = currentStat + 10;
      userData.stats = stats;
      await saveHunterData(db, senderID.toString(), userData);
      const trainMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Train",
        headerSymbol: "💪",
        headerStyle: "bold",
        bodyText: `Trained ${stat}! +10 (${cost} EXP). New ${stat}: ${stats[stat]}.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(trainMessage, threadID, messageID);
      return;
    }

    if (action === "quest") {
      if (!userData.quests["daily"] || userData.quests["daily"].completed || currentTime > (Number(userData.quests["daily"].timestamp) || 0) + 86400) {
        userData.quests["daily"] = {
          goal: Math.max(1, Math.floor(Math.random() * 3) + 1),
          progress: 0,
          reward: 1000,
          completed: false,
          timestamp: currentTime
        };
        const enemies = ["Ice Bear", "High Orc", "Flame Bear"];
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        userData.quests["daily"].target = target;
      }
      const quest = userData.quests["daily"];
      const questMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Quest",
        headerSymbol: "📜",
        headerStyle: "bold",
        bodyText: `Quest: Defeat ${Math.max(1, Number(quest.goal) || 1)} ${quest.target}. Progress: ${Math.max(0, Number(quest.progress) || 0)}/${Math.max(1, Number(quest.goal) || 1)}. Reward: ${Math.max(0, Number(quest.reward) || 0)} EXP.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(questMessage, threadID, messageID);
      return;
    }

    if (action === "guild") {
      const subAction = args[1]?.toLowerCase();
      const guildCollection = db.db("guilds");
      const guilds = await guildCollection.find({}).toArray();

      if (subAction === "create") {
        const guildName = args.slice(2).join(" ") || `Guild${Math.floor(Math.random() * 1000)}`;
        if (userData.guild) {
          const alreadyInGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Already in ${userData.guild}. Leave to create a new one.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(alreadyInGuild, threadID, messageID);
          return;
        }
        if (guilds.some(g => g.name === guildName)) {
          const guildExists = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: `Guild ${guildName} already exists. Join it instead!`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(guildExists, threadID, messageID);
          return;
        }
        userData.guild = guildName;
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const baseStrength = Math.max(0, Number(stats.strength) || 0);
        await guildCollection.insertOne({ name: guildName, members: [senderID.toString()], totalStrength: baseStrength + 30, hasChangedName: false });
        await saveHunterData(db, senderID.toString(), userData);
        const createMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "🛡️",
          headerStyle: "bold",
          bodyText: `Created Guild: ${guildName}. +30 Group Strength.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(createMessage, threadID, messageID);
        return;
      }

      if (subAction === "join") {
        const guildName = args.slice(2).join(" ");
        if (!guildName) {
          const invalidInput = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Please specify a guild name. Usage: /sl guild join <guild name>",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(invalidInput, threadID, messageID);
          return;
        }
        if (userData.guild) {
          const alreadyInGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Already in ${userData.guild}. Leave to join another.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(alreadyInGuild, threadID, messageID);
          return;
        }
        const targetGuild = guilds.find(g => g.name.toLowerCase() === guildName.toLowerCase());
        if (!targetGuild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: `Guild ${guildName} does not exist.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        userData.guild = targetGuild.name;
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const memberStrength = Math.max(0, Number(stats.strength) || 0);
        targetGuild.members.push(senderID.toString());
        targetGuild.totalStrength = Math.max(0, Number(targetGuild.totalStrength) || 0) + memberStrength;
        await guildCollection.updateOne({ name: targetGuild.name }, { $set: targetGuild });
        await saveHunterData(db, senderID.toString(), userData);
        const joinMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "✅",
          headerStyle: "bold",
          bodyText: `Joined Guild: ${targetGuild.name}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(joinMessage, threadID, messageID);
        return;
      }

      if (subAction === "leave") {
        if (!userData.guild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You are not in a guild to leave!",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === userData.guild);
        if (!currentGuild) {
          userData.guild = undefined;
          await saveHunterData(db, senderID.toString(), userData);
          const noGuildFound = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "Your guild no longer exists. You have been removed.",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuildFound, threadID, messageID);
          return;
        }
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const memberStrength = Math.max(0, Number(stats.strength) || 0);
        currentGuild.members = currentGuild.members.filter(member => member !== senderID.toString());
        currentGuild.totalStrength = Math.max(0, currentGuild.totalStrength - memberStrength);
        await guildCollection.updateOne({ name: currentGuild.name }, { $set: currentGuild });
        userData.guild = undefined;
        await saveHunterData(db, senderID.toString(), userData);
        const leaveMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "🚪",
          headerStyle: "bold",
          bodyText: `You have left ${currentGuild.name}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(leaveMessage, threadID, messageID);
        return;
      }

      if (subAction === "fight") {
        const targetGuildName = args.slice(2).join(" ");
        if (!targetGuildName) {
          const invalidInput = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Please specify a guild to fight. Usage: /sl guild fight <guild name>",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(invalidInput, threadID, messageID);
          return;
        }
        if (!userData.guild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You must be in a guild to fight!",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        const myGuild = guilds.find(g => g.name === userData.guild);
        const targetGuild = guilds.find(g => g.name.toLowerCase() === targetGuildName.toLowerCase());
        if (!targetGuild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: `Guild ${targetGuildName} does not exist.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        if (myGuild.name === targetGuild.name) {
          const selfFight = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: "You can't fight your own guild!",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(selfFight, threadID, messageID);
          return;
        }
        const myStrength = Math.max(0, Number(myGuild.totalStrength) || 0);
        const targetStrength = Math.max(0, Number(targetGuild.totalStrength) || 0);
        const fightResult = myStrength > targetStrength || userData.rank === "X";
        const expGain = Math.max(0, Math.floor(Math.random() * 1000) + 500);
        if (fightResult) {
          userData.exp = Math.max(0, Number(userData.exp) || 0) + expGain;
          userData.inventory.materials = userData.inventory.materials || {};
          userData.inventory.materials["Victory Token"] = Math.max(0, Number(userData.inventory.materials["Victory Token"] || 0) + 1);
          await saveHunterData(db, senderID.toString(), userData);
          const fightMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚔️",
            headerStyle: "bold",
            bodyText: `Victory! ${myGuild.name} defeated ${targetGuild.name} (${myStrength} vs ${targetStrength})! Gained ${expGain} EXP and 1 Victory Token.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(fightMessage, threadID, messageID);
        } else {
          const fightMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "💥",
            headerStyle: "bold",
            bodyText: `Defeated! ${myGuild.name} lost to ${targetGuild.name} (${myStrength} vs ${targetStrength}). Train harder!`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(fightMessage, threadID, messageID);
        }
        return;
      }

      if (subAction === "list") {
        if (guilds.length === 0) {
          const noGuilds = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "No guilds have been created yet.",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuilds, threadID, messageID);
          return;
        }
        const guildList = guilds.map(g => `- ${g.name}: ${Math.max(0, Number(g.totalStrength) || 0)} Total Strength`).join("\n");
        const listMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild List",
          headerSymbol: "🛡️",
          headerStyle: "bold",
          bodyText: `Active Guilds:\n${guildList}`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(listMessage, threadID, messageID);
        return;
      }

      if (subAction === "changename") {
        const newGuildName = args.slice(2).join(" ");
        if (!userData.guild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You must be in a guild to change its name!",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        if (!newGuildName) {
          const invalidInput = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Please specify a new guild name. Usage: /sl guild changename <new name>",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(invalidInput, threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === userData.guild);
        if (!currentGuild) {
          userData.guild = undefined;
          await saveHunterData(db, senderID.toString(), userData);
          const noGuildFound = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "Your guild no longer exists. You have been removed.",
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(noGuildFound, threadID, messageID);
          return;
        }
        if (currentGuild.hasChangedName) {
          const alreadyChanged = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Guild ${currentGuild.name} has already changed its name once.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(alreadyChanged, threadID, messageID);
          return;
        }
        if (guilds.some(g => g.name.toLowerCase() === newGuildName.toLowerCase())) {
          const nameTaken = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: `Guild name ${newGuildName} is already taken.`,
            bodyStyle: "bold",
            footerText: "Modefied by: Raniel",
          });
          await api.sendMessage(nameTaken, threadID, messageID);
          return;
        }
        // Update guild name in guild collection
        await guildCollection.updateOne(
          { name: currentGuild.name },
          { $set: { name: newGuildName, hasChangedName: true } }
        );
        // Update guild name for all members
        const huntersCollection = db.db("hunters");
        await huntersCollection.updateMany(
          { guild: currentGuild.name },
          { $set: { guild: newGuildName } }
        );
        userData.guild = newGuildName;
        await saveHunterData(db, senderID.toString(), userData);
        const changeNameMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "✅",
          headerStyle: "bold",
          bodyText: `Guild name changed from ${currentGuild.name} to ${newGuildName}.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(changeNameMessage, threadID, messageID);
        return;
      }

      const invalidGuildCommand = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Guild",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "Invalid guild command. Use /sl guild [create <name> | join <guild name> | leave | fight <guild name> | list | changename <new name>].",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(invalidGuildCommand, threadID, messageID);
      return;
    }

    if (action === "leaderboard") {
      const huntersCollection = db.db("hunters");
      const topHunters = await huntersCollection
        .find({})
        .sort({ exp: -1 })
        .limit(10)
        .toArray();
      const leaderboardMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Leaderboard",
        headerSymbol: "🏆",
        headerStyle: "bold",
        bodyText: topHunters.length > 0
          ? topHunters.map((h, i) => `${i + 1}. ${h.name} (Level ${Math.max(1, Number(h.level) || 1)}, ${Math.max(0, Number(h.exp) || 0)} EXP, Rank ${h.rank || "E"})`).join("\n")
          : "No hunters ranked yet.",
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(leaderboardMessage, threadID, messageID);
      return;
    }

    if (action === "meditate") {
      if (Math.max(0, Number(userData.meditateCooldown) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.meditateCooldown) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Meditate",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      stats.mana = Math.max(0, Number(stats.mana) || 0) + 50;
      userData.stats = stats;
      userData.meditateCooldown = currentTime + meditateCooldown;
      await saveHunterData(db, senderID.toString(), userData);
      const meditateMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Meditate",
        headerSymbol: "🧘",
        headerStyle: "bold",
        bodyText: `Meditated successfully! +50 Mana. New Mana: ${stats.mana}.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(meditateMessage, threadID, messageID);
      return;
    }

    if (action === "shadowlist") {
      const shadowList = userData.shadows.length > 0
        ? userData.shadows.map(s => `- ${s.name} (${s.nickname}, Level ${Math.max(1, Number(s.level) || 1)})`).join("\n")
        : "No shadows summoned.";
      const lostShadowList = userData.lostShadows && userData.lostShadows.length > 0
        ? userData.lostShadows.map(s => `- ${s.name} (${s.nickname})`).join("\n")
        : "No shadows lost.";
      const shadowMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Shadow List",
        headerSymbol: "🌑",
        headerStyle: "bold",
        bodyText: `Current Shadows:\n${shadowList}\n\nLost Shadows:\n${lostShadowList}`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(shadowMessage, threadID, messageID);
      return;
    }

    if (action === "setrole") {
      const role = args[1]?.toLowerCase();
      const validRoles = ["tank", "mage", "assassin", "healer", "ranger"];
      if (!role || !validRoles.includes(role)) {
        const invalidRole = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Set Role",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid role. Use /sl setrole <tank/mage/assassin/healer/ranger>.",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidRole, threadID, messageID);
        return;
      }
      userData.role = role;
      applyRoleSkills(userData);
      await saveHunterData(db, senderID.toString(), userData);
      const roleMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Set Role",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Role set to ${role}. Skills applied based on rank ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(roleMessage, threadID, messageID);
      return;
    }

    if (action === "changename") {
      const newName = args.slice(1).join(" ");
      if (!newName) {
        const invalidName = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Change Name",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a new name. Usage: /sl changename <newname>",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(invalidName, threadID, messageID);
        return;
      }
      if (userData.hasChangedName) {
        const alreadyChanged = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Change Name",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: "You can only change your name once!",
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(alreadyChanged, threadID, messageID);
        return;
      }
      const huntersCollection = db.db("hunters");
      const existingHunter = await huntersCollection.findOne({ name: newName });
      if (existingHunter) {
        const nameTaken = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Change Name",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `The name "${newName}" is already taken. Choose another.`,
          bodyStyle: "bold",
          footerText: "Modefied by: Raniel",
        });
        await api.sendMessage(nameTaken, threadID, messageID);
        return;
      }
      userData.name = newName;
      userData.hasChangedName = true;
      await saveHunterData(db, senderID.toString(), userData);
      const changeNameMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Change Name",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Name changed to ${newName}.`,
        bodyStyle: "bold",
        footerText: "Modefied by: Raniel",
      });
      await api.sendMessage(changeNameMessage, threadID, messageID);
      return;
    }

    const invalidCommand = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid command. Usage: /sl [register <name> | status | battle | battle X | shop | buy <item> <quantity> | use <potion> <quantity> | dungeon <tier> | train <stat> | quest | guild [create <name> | join <guild name> | leave | fight <guild name> | list | changename <new name>] | leaderboard | meditate | shadowlist | setrole <class> | changename <newname> | gate enter <class>]",
      bodyStyle: "bold",
      footerText: "Modefied by: Raniel",
    });
    await api.sendMessage(invalidCommand, threadID, messageID);
  },
};

async function getHunterData(db: any, userID: string): Promise<HunterData> {
  const huntersCollection = db.db("hunters");
  let userData = await huntersCollection.findOne({ userID });
  if (!userData) {
    userData = {
      userID,
      name: undefined,
      level: 1,
      exp: 0,
      rank: "E",
      role: undefined,
      equipment: { swords: {} },
      inventory: { potions: {}, materials: {} },
      shadows: [],
      stats: { strength: 10, agility: 10, mana: 10 },
      dungeonCooldown: 0,
      quests: {},
      meditateCooldown: 0,
      lostShadows: [],
      hasChangedName: false,
      gateCooldown: 0,
    };
    await saveHunterData(db, userID, userData);
  }
  return userData;
}

async function saveHunterData(db: any, userID: string, data: HunterData): Promise<void> {
  const huntersCollection = db.db("hunters");
  await huntersCollection.updateOne(
    { userID },
    { $set: data },
    { upsert: true }
  );
}

function applyRoleSkills(userData: HunterData): void {
  const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
  const role = userData.role?.toLowerCase();
  const rank = userData.rank || "E";
  const roleBoosts: { [key: string]: { strength: number; agility: number; mana: number } } = {
    tank: { strength: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 1000, agility: 0, mana: 0 },
    mage: { strength: 0, agility: 0, mana: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 1000 },
    assassin: { strength: 0, agility: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 1000, mana: 0 },
    healer: { strength: 0, agility: 0, mana: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 500 },
    ranger: { strength: 0, agility: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 500, mana: 0 },
  };
  if (role && roleBoosts[role]) {
    stats.strength = Math.max(0, Number(stats.strength) || 0) + roleBoosts[role].strength;
    stats.agility = Math.max(0, Number(stats.agility) || 0) + roleBoosts[role].agility;
    stats.mana = Math.max(0, Number(stats.mana) || 0) + roleBoosts[role].mana;
    userData.stats = stats;
  }
}

export default soloLevelingCommand;
