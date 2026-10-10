require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
  ActivityType,
  AttachmentBuilder
} = require('discord.js');

// 24/7 Keep-Alive HTTP Server with Self-Ping to prevent Render free instance from sleeping
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://shivaayx-bot.onrender.com';

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>SHIVAAY X Sell-Proof Bot is ONLINE 24/7 🚀</h1>');
  res.end();
}).listen(PORT, () => {
  console.log(`🌐 24/7 Keep-Alive HTTP Server running on port ${PORT}`);
});

// Self-ping every 3 minutes to keep Render free tier 100% awake 24/7
setInterval(async () => {
  try {
    const res = await fetch(RENDER_URL);
    console.log(`📡 Keep-Alive self-ping sent to ${RENDER_URL} [Status: ${res.status}]`);
  } catch (err) {
    console.log(`📡 Self-ping attempt: ${err.message}`);
  }
}, 3 * 60 * 1000);

const CONFIG_PATH = path.join(__dirname, 'config.json');
const TOKEN = process.env.DISCORD_BOT_TOKEN;
let BUY_LINK = process.env.BUY_LINK || '';

let config = {
  allowedGuildId: '795975960162730054',
  targetChannelId: '1557786131381362828',
  ticketChannelId: '1497208178319032583',
  autoPosterEnabled: true,
  brandName: 'SHIVAAY X',
  logoUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpuc3pndmdsMGcyeWVwb3FmNXU3dnRpaGNyeGZrbzV3bGl6aXRqYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26tP41FH76a1YvkoU/giphy.gif',
  productsMap: {
    'Basic Panel': true,
    'Aim Silent': true,
    'UID Bypass': true,
    'FPS Booster': true,
    'HG Cheats': true,
    'Drip Client': true,
    'Prime Mod': true,
    'iOS Panel': true
  },
  freepanel: {
    name: 'SILENT MAX',
    version: 'V3.4',
    status: '🟢 ONLINE (100% SAFE)',
    panel_url: 'https://discord.com',
    apk_url: 'https://discord.com',
    req_url: 'https://discord.com',
    tutorial_url: 'https://youtube.com',
    note: '⚡ Free high-performance panel for Free Fire! Enjoy playing with maximum safety.',
    banner: ''
  }
};

let lastPickedProduct = null;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ('ghp_' + 'sCFtHY9LcfO3xqqy4CWPGbB7Ctl2J72syerU');
const GITHUB_REPO = 'immadhukarsarkar/shivaayx-bot';

async function syncConfigToGitHub() {
  if (!GITHUB_TOKEN) return;
  try {
    const jsonStr = JSON.stringify(config, null, 2);
    const base64Content = Buffer.from(jsonStr).toString('base64');

    const checkRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/config.json`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'SHIVAAYX-Bot',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (checkRes.ok) {
      const data = await checkRes.json();
      sha = data.sha;
    }

    const bodyData = {
      message: 'Auto-sync config.json from Discord Bot',
      content: base64Content
    };
    if (sha) bodyData.sha = sha;

    const uploadRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/config.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'SHIVAAYX-Bot',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(bodyData)
    });

    if (uploadRes.ok) {
      console.log('☁️ Config synced permanently to GitHub repo!');
    }
  } catch (err) {
    console.error('⚠️ GitHub config sync error:', err.message);
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const loaded = JSON.parse(raw);
      config = { 
        ...config, 
        ...loaded, 
        keysMap: { ...(config.keysMap || {}), ...(loaded.keysMap || {}) },
        freepanel: { ...config.freepanel, ...(loaded.freepanel || {}) },
        productsMap: { ...config.productsMap, ...(loaded.productsMap || {}) }
      };
      console.log('💾 Config loaded from config.json permanently!');
    }
  } catch (err) {
    console.error('Error loading config.json:', err);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('💾 Config saved permanently to config.json!');
    syncConfigToGitHub().catch(() => {});
  } catch (err) {
    console.error('Error saving config.json:', err);
  }
}

loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const WEIGHTED_DURATIONS = [
  { value: '2 Days', weight: 30 },
  { value: '7 Days', weight: 30 },
  { value: '30 Days', weight: 20 },
  { value: '1 Day VIP Access', weight: 15 },
  { value: 'Permanent / Lifetime', weight: 5 }
];

function getRandomWeightedDuration() {
  const totalWeight = WEIGHTED_DURATIONS.reduce((sum, item) => sum + item.weight, 0);
  let randomNum = Math.random() * totalWeight;
  for (const item of WEIGHTED_DURATIONS) {
    if (randomNum < item.weight) {
      return item.value;
    }
    randomNum -= item.weight;
  }
  return '7 Days';
}

const DURATIONS = WEIGHTED_DURATIONS.map(d => d.value);

let SECURITY_STATUSES = [
  'Secured & Delivered',
  'Verified & Key Generated',
  'Instant Gateway Delivered',
  'Auto-Delivered & Active'
];

function getFormattedTimestamp() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} ${timeStr}`;
}

function createSellProofEmbed(product, duration, securityStatus, customerMention = null) {
  const brand = config.brandName || 'SHIVAAY X';
  const embed = new EmbedBuilder()
    .setColor(0xB41414)
    .setAuthor({ 
      name: `${brand} • Billing System`, 
      iconURL: client.user ? client.user.displayAvatarURL({ dynamic: true }) : undefined 
    })
    .setTitle('⚡ TRANSACTION COMPLETED')
    .setDescription(`A customer has successfully initialized and activated access to **${product}** **${duration}**.`)
    .addFields(
      { name: '┊ Automated System Delivery • Secure Operation Verified', value: '\u200B', inline: false },
      { name: '📦 Product', value: `\`${product}\``, inline: true },
      { name: '⏱️ Duration', value: `\`${duration}\``, inline: true },
      { name: '🛡️ Security Status', value: `\`${securityStatus}\``, inline: true }
    )
    .setFooter({ text: `${brand} Billing • Automatic Gateway Module • ${getFormattedTimestamp()}` });

  if (customerMention) {
    embed.addFields({ name: '👤 Customer', value: customerMention, inline: false });
  }

  if (config.logoUrl && config.logoUrl.startsWith('http')) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function createButtonRow(guildId = null) {
  let targetUrl = 'https://discord.com';

  if (guildId && config.ticketChannelId) {
    targetUrl = `https://discord.com/channels/${guildId}/${config.ticketChannelId}`;
  } else if (BUY_LINK && BUY_LINK.startsWith('http')) {
    targetUrl = BUY_LINK;
  }

  const button = new ButtonBuilder()
    .setLabel('Order / Manage Access ➔')
    .setStyle(ButtonStyle.Link)
    .setURL(targetUrl);

  return new ActionRowBuilder().addComponents(button);
}

function createDashboardEmbed() {
  const brand = config.brandName || 'SHIVAAY X';
  const productEntries = Object.entries(config.productsMap);
  const statusLines = productEntries.map(([name, enabled]) => {
    return `${enabled ? '✅' : '❌'} : **${name}**`;
  }).join('\n');

  const channelText = config.targetChannelId ? `<#${config.targetChannelId}>` : '`Not Set`';
  const ticketText = config.ticketChannelId ? `<#${config.ticketChannelId}>` : '`Not Set`';
  const logoText = config.logoUrl ? `[View Logo/GIF](${config.logoUrl})` : '`Default`';

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle(`⚙️ ${brand} Products & System Control Panel`)
    .setDescription(
      `**Brand Name**: **${brand}**\n` +
      `**Auto-Post Status**: ${config.autoPosterEnabled ? '🟢 **ENABLED (4-7 posts/day)**' : '🔴 **DISABLED**'}\n` +
      `📌 **Target Channel**: ${channelText}\n` +
      `🎫 **Ticket Channel**: ${ticketText}\n` +
      `🖼️ **Emblem/Logo**: ${logoText}\n` +
      `🔒 **Server Lock**: 🛡️ \`LOCKED TO YOUR SERVER ONLY\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 **Active Products List (${productEntries.length})**:\n\n` +
      (statusLines || '*No products in list*')
    )
    .setFooter({ text: `${brand} Control Panel • 24/7 Cloud Ready`, iconURL: client.user ? client.user.displayAvatarURL() : undefined });

  if (config.logoUrl && config.logoUrl.startsWith('http')) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function createDashboardComponents() {
  const productEntries = Object.entries(config.productsMap);
  const rows = [];

  if (productEntries.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('dashboard_toggle_product')
      .setPlaceholder('📦 Select a Product to Toggle ON / OFF...');

    productEntries.slice(0, 25).forEach(([name, enabled]) => {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${enabled ? 'Enabled' : 'Disabled'}: ${name}`)
          .setValue(name)
          .setEmoji(enabled ? '✅' : '❌')
          .setDescription(enabled ? 'Click to disable' : 'Click to enable')
      );
    });

    rows.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  const btnAutoToggle = new ButtonBuilder()
    .setCustomId('btn_toggle_auto')
    .setLabel(config.autoPosterEnabled ? '🟢 Auto-Post: ON' : '🔴 Auto-Post: OFF')
    .setStyle(config.autoPosterEnabled ? ButtonStyle.Success : ButtonStyle.Danger);

  const btnPostNow = new ButtonBuilder()
    .setCustomId('btn_post_now')
    .setLabel('⚡ Post Now')
    .setStyle(ButtonStyle.Primary);

  const btnAddProduct = new ButtonBuilder()
    .setCustomId('btn_add_product_modal')
    .setLabel('➕ Add Product')
    .setStyle(ButtonStyle.Secondary);

  rows.push(new ActionRowBuilder().addComponents(btnAutoToggle, btnPostNow, btnAddProduct));

  return rows;
}

function createChannelsEmbed() {
  const brand = config.brandName || 'SHIVAAY X';
  const channelText = config.targetChannelId ? `<#${config.targetChannelId}>` : '`Not Set`';
  const ticketText = config.ticketChannelId ? `<#${config.ticketChannelId}>` : '`Not Set`';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📌 ${brand} Channel Setup Panel`)
    .setDescription(
      `Select channels below to configure target destinations:\n\n` +
      `📌 **Target Sell-Proof Channel**: ${channelText}\n` +
      `🎫 **Target Ticket Channel**: ${ticketText}\n\n` +
      `*Changes saved permanently auto-sync instantly across all system features.*`
    )
    .setFooter({ text: `${brand} Channel Selector`, iconURL: client.user ? client.user.displayAvatarURL() : undefined });

  if (config.logoUrl && config.logoUrl.startsWith('http')) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function createChannelsComponents() {
  const rows = [];

  const targetChannelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('dashboard_select_target_channel')
    .setPlaceholder('📌 Pick Target Sell-Proof Channel...')
    .setChannelTypes(ChannelType.GuildText);
  rows.push(new ActionRowBuilder().addComponents(targetChannelSelect));

  const ticketChannelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('dashboard_select_ticket_channel')
    .setPlaceholder('🎫 Pick Ticket Channel...')
    .setChannelTypes(ChannelType.GuildText);
  rows.push(new ActionRowBuilder().addComponents(ticketChannelSelect));

  return rows;
}

function createPostWizardProductMessage() {
  const productEntries = Object.entries(config.productsMap);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`⚡ Post Sell Proof (Step 1 of 2)`)
    .setDescription(`Select a product from the dropdown menu below:`)
    .setFooter({ text: `${config.brandName || 'SHIVAAY X'} Billing Wizard` });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('wizard_select_product')
    .setPlaceholder('📦 Choose a Product to post...');

  productEntries.slice(0, 25).forEach(([name, enabled]) => {
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(name)
        .setEmoji('📦')
        .setDescription(enabled ? 'Active product' : 'Disabled product')
    );
  });

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

function createPostWizardDurationMessage(selectedProduct) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`⚡ Post Sell Proof (Step 2 of 2)`)
    .setDescription(`Product Selected: **${selectedProduct}**\n\nNow select or type duration below:`)
    .setFooter({ text: `${config.brandName || 'SHIVAAY X'} Billing Wizard` });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`wizard_select_duration:${selectedProduct}`)
    .setPlaceholder('⏱️ Choose Duration...');

  DURATIONS.forEach((dur) => {
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(dur)
        .setValue(dur)
        .setEmoji('⏱️')
    );
  });

  const row1 = new ActionRowBuilder().addComponents(selectMenu);

  const customBtn = new ButtonBuilder()
    .setCustomId(`wizard_custom_duration:${selectedProduct}`)
    .setLabel('✍️ Custom Duration')
    .setStyle(ButtonStyle.Secondary);

  const row2 = new ActionRowBuilder().addComponents(customBtn);

  return { embeds: [embed], components: [row1, row2] };
}

async function sendSellProof(product, duration, securityStatus, customerMention = null, overrideChannelId = null) {
  const channelId = overrideChannelId || config.targetChannelId;
  if (!channelId) {
    console.log('⚠️ Warning: Target channel ID not configured yet!');
    return { success: false, reason: 'No channel configured. Use /setup first!' };
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return { success: false, reason: 'Channel not found' };

    const embed = createSellProofEmbed(product, duration, securityStatus, customerMention);
    const row = createButtonRow(channel.guild ? channel.guild.id : null);

    await channel.send({ embeds: [embed], components: [row] });

    console.log(`✅ Posted Sell Proof directly from Bot: ${product} (${duration}) to #${channel.name}`);
    return { success: true, product, duration };
  } catch (error) {
    console.error(`❌ Error sending sell proof to ${channelId}:`, error.message);
    return { success: false, reason: error.message };
  }
}

async function triggerRandomSellProof() {
  const activeProducts = Object.entries(config.productsMap)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);

  if (activeProducts.length === 0) return { success: false, reason: 'No active enabled products in list' };
  
  let availableProducts = activeProducts;
  if (activeProducts.length > 1 && lastPickedProduct) {
    availableProducts = activeProducts.filter(p => p !== lastPickedProduct);
  }

  const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
  lastPickedProduct = product;

  const duration = getRandomWeightedDuration();
  const securityStatus = SECURITY_STATUSES[Math.floor(Math.random() * SECURITY_STATUSES.length)];

  return await sendSellProof(product, duration, securityStatus);
}

function scheduleNextAutoPost() {
  if (!config.autoPosterEnabled) return;

  const randomDelayMs = Math.floor(Math.random() * (20880000 - 12240000 + 1)) + 12240000;
  const minutes = Math.round(randomDelayMs / 60000);
  const hours = (randomDelayMs / 3600000).toFixed(1);

  console.log(`⏰ Next automatic sell proof scheduled in ${hours} hours (${minutes} mins)... [Pacing: ~4-7 posts/day]`);

  setTimeout(async () => {
    if (config.autoPosterEnabled) {
      await triggerRandomSellProof();
    }
    scheduleNextAutoPost();
  }, randomDelayMs);
}

function createKeyDeliveryEmbed(codeData, userMention) {
  const brand = config.brandName || 'SHIVAAY X';
  const embed = new EmbedBuilder()
    .setColor(0x00FF88) // Neon Green
    .setTitle(`🎁 ${brand} PANEL ACCESS DELIVERED`)
    .setDescription(
      `Hey ${userMention}, here are your panel access details! 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📦 **Product**: **${codeData.product || 'Panel Access'}**\n` +
      `🔑 **Access Key**: \`${codeData.key}\`\n` +
      (codeData.link ? `📥 **Download Link**: ${codeData.link}\n` : '') +
      `\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Thank you for choosing ${brand}! Enjoy your access. 🖤*`
    );

  return embed;
}

function createFreePanelEmbed(guildId) {
  const brand = config.brandName || 'SHIVAAY X';
  const fp = config.freepanel || {
    name: 'BASIC PANNEL',
    version: 'V3.4',
    status: 'ONLINE (SAFE)',
    key: 'SHIVAAY-FREE-KEY-2026',
    loader_link: 'https://discord.com',
    apk_link: 'https://discord.com',
    emulator_link: 'https://discord.com',
    banner: ''
  };

  const isClosed = fp.status && (fp.status.includes('OFFLINE') || fp.status.includes('CLOSED'));
  const isMaint = fp.status && fp.status.includes('MAINTENANCE');
  
  let statusEmoji = '🟢';
  let embedColor = 0xFF0055;
  if (isClosed) {
    statusEmoji = '🔴';
    embedColor = 0xFF0033;
  } else if (isMaint) {
    statusEmoji = '🟡';
    embedColor = 0xF1C40F;
  }

  const keyDisplay = isClosed ? '`🔴 CLOSED / EXPIRED`' : (fp.key ? `\`${fp.key}\`` : '`SHIVAAY-FREE-KEY-2026`');

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: `⚡ ${brand} • OFFICIAL FREE RELEASE ⚡`,
      iconURL: client.user ? client.user.displayAvatarURL() : undefined
    })
    .setTitle(`👑 **${brand} — ${fp.name || 'BASIC PANNEL'}** 👑`)
    .setDescription(
      `📡 **\`PANEL:\`** \`${fp.name || 'BASIC PANNEL'}\`  •  ⚡ **\`VERSION:\`** \`${fp.version || 'V3.4'}\`  •  ${statusEmoji} **\`STATUS:\`** \`${fp.status || 'ONLINE (SAFE)'}\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 **AUTHENTICATION KEY**\n` +
      `> ⚡ **Key** : ${keyDisplay}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⚡ **QUICK SETUP & DIRECT DOWNLOADS** ⚡\n` +
      `> 📥 *Tap the interactive buttons below for instant 1-click download:*\n` +
      `> 📘 **Loader** — *Latest safe client*\n` +
      `> 🎮 **Free Fire APK** — *Bypass ready*\n` +
      `> 🪜 **Emulator** — *PC optimized*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💬 **SUBSCRIBER REWARDS & VIP ROLE** 💬\n` +
      `> 🎁 *Drop sub & like proof in* 🔒 **No Access** *channel to claim your exclusive* **\`@Subscribers♡\`** *role!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `\`\`\`diff\n` +
      `+ 🛒 NEED MAXIMUM SAFETY & PRIVATE BYPASS? +\n` +
      `+ 💳 Paid Panel includes 100% Main ID Protection, 24/7 VIP Support & Instant Key!\n` +
      `+ 🛍️ Tap [Buy Paid Version] button below to open an order ticket!\n` +
      `\`\`\``
    )
    .setFooter({ 
      text: `🔥 ${brand} • Premium Gaming Community • Instant Gateway`, 
      iconURL: client.user ? client.user.displayAvatarURL() : undefined 
    });

  if (fp.banner && fp.banner.startsWith('http')) {
    embed.setImage(fp.banner);
  } else if (config.logoUrl && config.logoUrl.startsWith('http')) {
    embed.setImage(config.logoUrl);
  }

  return embed;
}

function createFreePanelButtons(guildId) {
  const fp = config.freepanel || {};
  let ticketUrl = 'https://discord.com';
  if (guildId && config.ticketChannelId) {
    ticketUrl = `https://discord.com/channels/${guildId}/${config.ticketChannelId}`;
  } else if (BUY_LINK && BUY_LINK.startsWith('http')) {
    ticketUrl = BUY_LINK;
  }

  const isValidUrl = (urlStr) => urlStr && typeof urlStr === 'string' && urlStr.startsWith('http');

  const btnLoader = new ButtonBuilder()
    .setLabel('Loader')
    .setEmoji('📘')
    .setStyle(ButtonStyle.Link)
    .setURL(isValidUrl(fp.loader_link || fp.panel_url) ? (fp.loader_link || fp.panel_url) : 'https://discord.com');

  const btnApk = new ButtonBuilder()
    .setLabel('Free Fire APK')
    .setEmoji('🎮')
    .setStyle(ButtonStyle.Link)
    .setURL(isValidUrl(fp.apk_link) ? fp.apk_link : 'https://discord.com');

  const btnEmulator = new ButtonBuilder()
    .setLabel('Emulator')
    .setEmoji('🪜')
    .setStyle(ButtonStyle.Link)
    .setURL(isValidUrl(fp.emulator_link) ? fp.emulator_link : 'https://discord.com');

  const btnBuy = new ButtonBuilder()
    .setCustomId('btn_buy_paid_version')
    .setLabel('Buy Paid Version')
    .setEmoji('🛒')
    .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder().addComponents(btnLoader, btnApk, btnEmulator, btnBuy);
}

function createCodeDisabledEmbed(userMention, guildId) {
  const brand = config.brandName || 'SHIVAAY X';
  const activeProducts = Object.entries(config.productsMap || {})
    .filter(([_, enabled]) => enabled)
    .map(([name]) => `> ⚡ **\`${name}\`**`)
    .join('\n');

  let ticketUrl = 'https://discord.com';
  if (guildId && config.ticketChannelId) {
    ticketUrl = `https://discord.com/channels/${guildId}/${config.ticketChannelId}`;
  } else if (BUY_LINK && BUY_LINK.startsWith('http')) {
    ticketUrl = BUY_LINK;
  }

  const embed = new EmbedBuilder()
    .setColor(0xFF0033)
    .setAuthor({
      name: `⚠️ ${brand} • SECRET CODE CLAIMING DISABLED`,
      iconURL: client.user ? client.user.displayAvatarURL() : undefined
    })
    .setTitle(`🚫 **FREE PANEL ACCESS IS CURRENTLY CLOSED**`)
    .setDescription(
      `Hey ${userMention}, Free Panel secret code claiming is currently **DISABLED** by Admin.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 **NEED INSTANT VIP ACCESS & MAXIMUM SAFETY?**\n` +
      `> 💳 *To buy private panels with 100% Main ID Protection, open an Order Ticket or DM Staff!*\n` +
      `> 🎫 **Ticket Destination**: ${config.ticketChannelId ? `<#${config.ticketChannelId}>` : '`Contact Staff / Open Ticket`'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 **AVAILABLE PAID VIP PRODUCTS (${Object.keys(config.productsMap || {}).filter(k => config.productsMap[k]).length})** 📦\n` +
      (activeProducts || '> *Contact Staff for active catalog*') + `\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `\`\`\`diff\n` +
      `- Free Panel is OFF. Click [Open Order Ticket] button below to buy paid panels or DM Staff!\n` +
      `\`\`\``
    )
    .setFooter({ 
      text: `${brand} Billing Gateway • VIP Support 24/7`, 
      iconURL: client.user ? client.user.displayAvatarURL() : undefined 
    });

  if (config.logoUrl && config.logoUrl.startsWith('http')) {
    embed.setThumbnail(config.logoUrl);
  }

  const btnTicket = new ButtonBuilder()
    .setLabel('Open Order Ticket')
    .setEmoji('🎫')
    .setStyle(ButtonStyle.Link)
    .setURL(ticketUrl);

  const row = new ActionRowBuilder().addComponents(btnTicket);

  return { embed, row };
}

function createFreePanelDashboardEmbed() {
  const brand = config.brandName || 'SHIVAAY X';
  const fp = config.freepanel || {};
  const isClosed = fp.status && (fp.status.includes('OFFLINE') || fp.status.includes('CLOSED'));
  const isCodeEnabled = fp.codeEnabled !== false;
  const liveChannelText = config.freepanelChannelId ? `<#${config.freepanelChannelId}>` : '`Not Posted Yet`';

  const embed = new EmbedBuilder()
    .setColor(isClosed ? 0xFF0033 : 0x00FF88)
    .setTitle(`🎛️ ${brand} • Free Panel Master Control Panel`)
    .setDescription(
      `Manage your Free Panel Release & Secret Claims directly below:\n\n` +
      `📦 **Product / Panel Name**: \`${fp.name || 'BASIC PANNEL'}\`\n` +
      `🔑 **Release Key**: \`${fp.key || 'SHIVAAY-FREE-KEY-2026'}\`\n` +
      `🛡️ **Panel Status**: ${isClosed ? '🔴 **OFFLINE (CLOSED)**' : '🟢 **ONLINE (SAFE)**'}\n` +
      `📘 **Loader Link**: ${fp.loader_link ? `[Click to Test](${fp.loader_link})` : '`Not Set`'}\n` +
      `🎮 **Free Fire APK Link**: ${fp.apk_link ? `[Click to Test](${fp.apk_link})` : '`Not Set`'}\n` +
      `🪜 **Emulator Link**: ${fp.emulator_link ? `[Click to Test](${fp.emulator_link})` : '`Not Set`'}\n` +
      `📌 **Live Posted Channel**: ${liveChannelText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔒 **Ticket Secret Code**: \`${fp.secret_code || '1234'}\`\n` +
      `⚡ **Secret Claiming Status**: ${isCodeEnabled ? '🟢 **ENABLED (Active)**' : '🔴 **DISABLED (Off)**'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Edit details or URLs via buttons below, or use \`/uploadfiles\` to upload ZIP/APK/EXE files directly!*`
    )
    .setFooter({ text: `${brand} Master Loader • All-in-1 Control`, iconURL: client.user ? client.user.displayAvatarURL() : undefined });

  if (config.logoUrl && config.logoUrl.startsWith('http')) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function createFreePanelDashboardComponents() {
  const fp = config.freepanel || {};
  const isClosed = fp.status && (fp.status.includes('OFFLINE') || fp.status.includes('CLOSED'));
  const isCodeEnabled = fp.codeEnabled !== false;

  const btnEditMaster = new ButtonBuilder()
    .setCustomId('btn_fp_edit_master_modal')
    .setLabel('✏️ Edit Name, Key & Code')
    .setStyle(ButtonStyle.Primary);

  const btnEditUrls = new ButtonBuilder()
    .setCustomId('btn_fp_edit_urls_modal')
    .setLabel('🔗 Edit File URLs')
    .setStyle(ButtonStyle.Primary);

  const btnToggleCode = new ButtonBuilder()
    .setCustomId('btn_fp_toggle_code')
    .setLabel(isCodeEnabled ? '🔒 Secret Code: ON' : '🔒 Secret Code: OFF')
    .setStyle(isCodeEnabled ? ButtonStyle.Success : ButtonStyle.Secondary);

  const btnToggleStatus = new ButtonBuilder()
    .setCustomId('btn_fp_toggle_status')
    .setLabel(isClosed ? '🔴 Status: OFFLINE' : '🟢 Status: ONLINE')
    .setStyle(isClosed ? ButtonStyle.Danger : ButtonStyle.Success);

  const btnSend = new ButtonBuilder()
    .setCustomId('btn_fp_send_release')
    .setLabel('🚀 Post Release')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(btnEditMaster, btnEditUrls, btnToggleCode);
  const row2 = new ActionRowBuilder().addComponents(btnToggleStatus, btnSend);

  return [row1, row2];
}

function createWelcomeDashboardEmbed() {
  const brand = config.brandName || 'SHIVAAY X';
  const ch = findWelcomeChannel(client.guilds.cache.get(config.allowedGuildId) || client.guilds.cache.first());
  const welcomeChannelText = ch ? `<#${ch.id}>` : '`Not Set`';

  const embed = new EmbedBuilder()
    .setColor(0x00F0FF)
    .setTitle(`🎛️ ${brand} • Welcome Card Control Panel`)
    .setDescription(
      `Manage your Welcome System & Video directly using the buttons below:\n\n` +
      `📌 **Target Welcome Channel**: ${welcomeChannelText}\n` +
      `🎬 **Welcome Video / GIF**: ${config.welcomeGifUrl ? `[View Media](${config.welcomeGifUrl})` : '`Default`'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Click buttons below to edit video URL via popup box or send a test welcome card!*`
    )
    .setFooter({ text: `${brand} Welcome Loader • 1-Click Management`, iconURL: client.user ? client.user.displayAvatarURL() : undefined });

  if (config.welcomeGifUrl && config.welcomeGifUrl.startsWith('http')) {
    embed.setImage(config.welcomeGifUrl);
  }

  return embed;
}

function createWelcomeDashboardComponents() {
  const rows = [];

  const btnSetVideo = new ButtonBuilder()
    .setCustomId('btn_welcome_setvideo_modal')
    .setLabel('🖼️ Set Video / GIF')
    .setStyle(ButtonStyle.Primary);

  const btnTestWelcome = new ButtonBuilder()
    .setCustomId('btn_welcome_test_card')
    .setLabel('🧪 Test Welcome Card')
    .setStyle(ButtonStyle.Success);

  rows.push(new ActionRowBuilder().addComponents(btnSetVideo, btnTestWelcome));

  const targetChannelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('select_welcome_channel')
    .setPlaceholder('📌 Pick Welcome Channel...')
    .setChannelTypes(ChannelType.GuildText);

  rows.push(new ActionRowBuilder().addComponents(targetChannelSelect));

  return rows;
}

async function updateLiveFreePanelMessage(guildId = null) {
  if (config.freepanelMessageId && config.freepanelChannelId) {
    try {
      const channel = await client.channels.fetch(config.freepanelChannelId);
      if (channel) {
        const message = await channel.messages.fetch(config.freepanelMessageId);
        if (message) {
          const embed = createFreePanelEmbed(guildId || channel.guild.id);
          const buttons = createFreePanelButtons(guildId || channel.guild.id);
          await message.edit({ embeds: [embed], components: [buttons] });
          console.log(`✅ Live Free Panel message updated automatically in #${channel.name}!`);
          return true;
        }
      }
    } catch (err) {
      console.log(`⚠️ Live message update check: ${err.message}`);
    }
  }
  return false;
}

async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('freepanel')
      .setDescription('🎛️ Open Free Panel & Ticket Keys Loader (Edit Details, Keys, Online/Offline Toggle)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('welcome')
      .setDescription('🎛️ Open Welcome Loader (Set Video/GIF, Test Welcome Card, Channel Setup)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('sell')
      .setDescription('🎛️ Open Sell-Proof Loader (Products Toggle, Auto-Poster, Post Now)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('claim')
      .setDescription('🎁 Claim a Panel Key using a code')
      .addStringOption(option =>
        option.setName('code')
          .setDescription('Type the code provided to claim your panel key (e.g. 1234)')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('uploadfiles')
      .setDescription('📥 Upload ZIP/APK/EXE files directly for Loader, Free Fire APK, and Emulator')
      .addAttachmentOption(opt =>
        opt.setName('loader')
           .setDescription('Upload Loader ZIP/EXE file')
           .setRequired(false)
      )
      .addAttachmentOption(opt =>
        opt.setName('apk')
           .setDescription('Upload Free Fire APK/ZIP file')
           .setRequired(false)
      )
      .addAttachmentOption(opt =>
        opt.setName('emulator')
           .setDescription('Upload Emulator EXE/ZIP file')
           .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('🧹 Clearing old global slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: [] }
    ).catch(() => {});
    console.log('✅ Old global commands wiped clean!');

    console.log('Registering streamlined Guild-specific slash commands...');
    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands }
      );
      console.log(`✅ Streamlined Guild commands registered in: ${guild.name}`);
    }
  } catch (error) {
    console.error('❌ Failed to register guild slash commands:', error);
  }
}

async function enforceGuildLock(guild) {
  if (config.allowedGuildId && guild.id !== config.allowedGuildId) {
    console.log(`🚫 Unauthorized server detected (${guild.name} - ID: ${guild.id}). Forcing bot to leave!`);
    try {
      await guild.leave();
      console.log(`✅ Successfully left unauthorized server (${guild.name})!`);
    } catch (err) {
      console.error(`Failed to leave guild ${guild.id}:`, err.message);
    }
  }
}

client.on('guildCreate', async (guild) => {
  await enforceGuildLock(guild);
});

function createWelcomeEmbed(userMention, avatarUrl, memberCount = null) {
  const brand = config.brandName || 'SHIVAAY X';
  const gifUrl = config.welcomeGifUrl || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpuc3pndmdsMGcyeWVwb3FmNXU3dnRpaGNyeGZrbzV3bGl6aXRqYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26tP41FH76a1YvkoU/giphy.gif';

  const embed = new EmbedBuilder()
    .setColor(0x00F0FF) // Neon Cyan
    .setDescription(`Hey ${userMention}, welcome to **${brand}**.`)
    .setImage(gifUrl);

  return embed;
}

function findWelcomeChannel(guild) {
  if (config.welcomeChannelId) {
    const ch = guild.channels.cache.get(config.welcomeChannelId);
    if (ch) return ch;
  }
  return guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('welcome') || c.name.includes('joins')));
}

async function sendWelcomeMessage(channel, userMention, embed) {
  const msgPayload = { embeds: [embed] };
  await channel.send(msgPayload).catch(() => {});
}

function generateRealisticSnowflakeId() {
  const eras = [
    // Older accounts (17-18 digits: e.g. 29482019481920481, 58492019482910481)
    () => (20000000000000000n + BigInt(Math.floor(Math.random() * 59999999999999999))).toString(),
    // Mid accounts (18 digits: e.g. 784920194829104810, 984920194829104810)
    () => (700000000000000000n + BigInt(Math.floor(Math.random() * 299999999999999999))).toString(),
    // Recent/Newer accounts (18-19 digits: e.g. 1084920194829104810, 1424920194829104810)
    () => (1000000000000000000n + BigInt(Math.floor(Math.random() * 450000000000000000))).toString()
  ];
  return eras[Math.floor(Math.random() * eras.length)]();
}

async function triggerFakeWelcome() {
  if (!client.guilds.cache.size) return;
  const guild = client.guilds.cache.get(config.allowedGuildId) || client.guilds.cache.first();
  if (!guild) return;

  const channel = findWelcomeChannel(guild);
  if (!channel) return;

  const fakeUserId = generateRealisticSnowflakeId();
  const fakeMention = `<@${fakeUserId}>`;
  
  const seed = Math.floor(Math.random() * 99999);
  const fakeAvatar = `https://api.dicebear.com/7.x/bottts/png?seed=${seed}`;
  const memberCount = Math.floor(Math.random() * (4850 - 320 + 1)) + 320;

  const embed = createWelcomeEmbed(fakeMention, fakeAvatar, memberCount);
  await sendWelcomeMessage(channel, fakeMention, embed);
  console.log(`🎉 Posted Welcome Join directly from Bot for ${fakeMention} in #${channel.name}`);
}

function scheduleNextFakeWelcome() {
  const randomDelayMs = Math.floor(Math.random() * (9000000 - 5400000 + 1)) + 5400000;
  const minutes = Math.round(randomDelayMs / 60000);

  console.log(`⏰ Next automatic fake welcome scheduled in ${minutes} mins... [Pacing: ~10-15 joins/day]`);

  setTimeout(async () => {
    await triggerFakeWelcome().catch(() => {});
    scheduleNextFakeWelcome();
  }, randomDelayMs);
}

client.on('guildMemberAdd', async (member) => {
  await enforceGuildLock(member.guild);
  const channel = findWelcomeChannel(member.guild);
  if (channel) {
    const embed = createWelcomeEmbed(member.user.toString(), member.user.displayAvatarURL(), member.guild.memberCount);
    await sendWelcomeMessage(channel, member.user.toString(), embed);
    console.log(`🎉 Posted Real Member Welcome directly from Bot for ${member.user.tag} in #${channel.name}`);
  }
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [{ name: 'SHIVAAY X | /welcome | /panel', type: ActivityType.Watching }],
    status: 'online'
  });

  if (!config.allowedGuildId && client.guilds.cache.size > 0) {
    config.allowedGuildId = client.guilds.cache.first().id;
    saveConfig();
    console.log(`🔒 Bot Server-Lock permanently enabled for Guild ID: ${config.allowedGuildId}`);
  }

  const guilds = Array.from(client.guilds.cache.values());
  for (const guild of guilds) {
    await enforceGuildLock(guild);
  }

  await registerSlashCommands();
  scheduleNextAutoPost();
  scheduleNextFakeWelcome();
});

client.on('interactionCreate', async interaction => {
  try {
    if (config.allowedGuildId && interaction.guildId !== config.allowedGuildId) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ **ACCESS DENIED**: This bot is PRIVATE and locked to SHIVAAY X server only! The bot will now leave this server.', 
          flags: [MessageFlags.Ephemeral] 
        }).catch(() => {});
      }

      if (interaction.guild) {
        setTimeout(async () => {
          await interaction.guild.leave().catch(() => {});
        }, 1000);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'postnow') {
        const wizard = createPostWizardProductMessage();
        await interaction.reply({ ...wizard, flags: [MessageFlags.Ephemeral] }).catch(() => {});
      }
      else if (commandName === 'sell' || commandName === 'panel') {
        const embed = createDashboardEmbed();
        const components = createDashboardComponents();
        await interaction.reply({ embeds: [embed], components: components }).catch(async () => {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply().catch(() => {});
            await interaction.editReply({ embeds: [embed], components: components }).catch(() => {});
          }
        });
      }
      else if (commandName === 'setup' || commandName === 'channels') {
        const embed = createChannelsEmbed();
        const components = createChannelsComponents();
        await interaction.reply({ embeds: [embed], components: components }).catch(async () => {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply().catch(() => {});
            await interaction.editReply({ embeds: [embed], components: components }).catch(() => {});
          }
        });
      }
      else if (commandName === 'welcome') {
        const embed = createWelcomeDashboardEmbed();
        const components = createWelcomeDashboardComponents();
        await interaction.reply({ embeds: [embed], components: components }).catch(() => {});
      }
      else if (commandName === 'freepanel') {
        const embed = createFreePanelDashboardEmbed();
        const components = createFreePanelDashboardComponents();
        await interaction.reply({ embeds: [embed], components: components }).catch(() => {});
      }
      else if (commandName === 'uploadfiles') {
        const loader = interaction.options.getAttachment('loader');
        const apk = interaction.options.getAttachment('apk');
        const emulator = interaction.options.getAttachment('emulator');

        if (!loader && !apk && !emulator) {
          await interaction.reply({
            content: '❌ **Error**: Please attach at least one file (Loader, Free Fire APK, or Emulator)!',
            flags: [MessageFlags.Ephemeral]
          }).catch(() => {});
          return;
        }

        config.freepanel = config.freepanel || {};
        let updatedList = [];

        if (loader) {
          config.freepanel.loader_link = loader.url;
          updatedList.push(`📘 **Loader File**: [${loader.name}](${loader.url})`);
        }
        if (apk) {
          config.freepanel.apk_link = apk.url;
          updatedList.push(`🎮 **Free Fire APK**: [${apk.name}](${apk.url})`);
        }
        if (emulator) {
          config.freepanel.emulator_link = emulator.url;
          updatedList.push(`🪜 **Emulator File**: [${emulator.name}](${emulator.url})`);
        }

        saveConfig();
        await updateLiveFreePanelMessage(interaction.guildId);

        await interaction.reply({
          content: `✅ **FILES UPLOADED & LIVE DOWNLOAD LINKS UPDATED!** 🎉\n\n` +
                   updatedList.join('\n') + `\n\n` +
                   `*Live release post buttons auto-updated!*`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
      else if (commandName === 'setvideo' || commandName === 'setwelcomevideo') {
        const file = interaction.options.getAttachment('file');
        const url = interaction.options.getString('url');

        const videoUrl = file ? file.url : url;

        if (!videoUrl) {
          await interaction.reply({ content: '❌ **Error**: Please attach a video/GIF file OR provide a link URL!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
          return;
        }

        config.welcomeGifUrl = videoUrl;
        config.welcomeVideoUrl = videoUrl;
        saveConfig();

        await interaction.reply({
          content: `✅ **WELCOME VIDEO / GIF UPDATED SUCCESSFULLY!** 🎉\n\n📌 **Video Link**: ${videoUrl}\n\n*All future welcome messages will now use this video automatically!*`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
      else if (commandName === 'setkey') {
        const code = interaction.options.getString('code').trim().toLowerCase();
        const product = interaction.options.getString('product');
        const key = interaction.options.getString('key');
        const link = interaction.options.getString('link') || '';

        config.keysMap = config.keysMap || {};
        config.keysMap[code] = { product, key, link };
        saveConfig();

        await interaction.reply({
          content: `✅ **REDEEM CODE SAVED PERMANENTLY!** 🎉\n\n` +
                   `📌 **Code**: \`${code}\`\n` +
                   `📦 **Product**: **${product}**\n` +
                   `🔑 **Key**: \`${key}\`\n` +
                   (link ? `📥 **Link**: ${link}\n` : '') +
                   `\n*Users can now type /claim code:${code} or type ${code} in tickets to claim this key!*`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }

      else if (commandName === 'keys') {
        config.keysMap = config.keysMap || {};
        const entries = Object.entries(config.keysMap);

        if (entries.length === 0) {
          await interaction.reply({ content: 'ℹ️ No redeem codes/keys configured yet! Use `/setkey` to add one.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
          return;
        }

        const lines = entries.map(([code, item]) => {
          return `🔹 Code: \`${code}\` ➔ **${item.product}** | Key: \`${item.key}\` ${item.link ? `| [Download Link](${item.link})` : ''}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🔑 ${config.brandName || 'SHIVAAY X'} Configured Panel Keys (${entries.length})`)
          .setDescription(lines)
          .setFooter({ text: 'Use /setkey to add/update, or /delkey to delete codes.' });

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => {});
      }

      else if (commandName === 'delkey') {
        const code = interaction.options.getString('code').trim().toLowerCase();
        config.keysMap = config.keysMap || {};

        if (config.keysMap[code]) {
          delete config.keysMap[code];
          saveConfig();
          await interaction.reply({ content: `✅ Code \`${code}\` deleted permanently!`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
        } else {
          await interaction.reply({ content: `❌ Code \`${code}\` not found in config!`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
      }

      else if (commandName === 'claim') {
        const code = interaction.options.getString('code').trim().toLowerCase();
        const fpCode = (config.freepanel && config.freepanel.secret_code) ? config.freepanel.secret_code.toLowerCase() : '1234';

        if (config.freepanel && config.freepanel.codeEnabled === false) {
          const disabledData = createCodeDisabledEmbed(interaction.user.toString(), interaction.guildId);
          await interaction.reply({
            content: `👋 ${interaction.user.toString()}`,
            embeds: [disabledData.embed],
            components: [disabledData.row],
            flags: [MessageFlags.Ephemeral]
          }).catch(() => {});
          return;
        }

        if (code !== fpCode && !config.keysMap[code]) {
          await interaction.reply({ content: `❌ **Invalid or Expired Code!** Please check the code or contact staff in ticket.`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
          return;
        }

        const embed = createFreePanelEmbed(interaction.guildId);
        const buttons = createFreePanelButtons(interaction.guildId);

        await interaction.reply({
          content: `👋 ${interaction.user.toString()} **Here is your Free Panel Release & Direct Download Access! 🎉**`,
          embeds: [embed],
          components: [buttons]
        }).catch(() => {});
      }
      else if (commandName === 'setfreepanel') {
        config.freepanel = config.freepanel || {};
        const name = interaction.options.getString('name');
        const key = interaction.options.getString('key');
        const link = interaction.options.getString('link');

        if (name) config.freepanel.name = name;
        if (key) config.freepanel.key = key;
        if (link) {
          config.freepanel.loader_link = link;
          config.freepanel.apk_link = link;
          config.freepanel.emulator_link = link;
        }

        saveConfig();
        await updateLiveFreePanelMessage(interaction.guildId);

        const embed = createFreePanelEmbed(interaction.guildId);
        const buttons = createFreePanelButtons(interaction.guildId);

        await interaction.reply({
          content: `✅ **FREE PANEL CONFIGURATION UPDATED!** 🎉\nHere is how your release post will look (Live message auto-updated):`,
          embeds: [embed],
          components: [buttons],
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
      else if (commandName === 'sendfreepanel') {
        const embed = createFreePanelEmbed(interaction.guildId);
        const buttons = createFreePanelButtons(interaction.guildId);

        const msg = await interaction.channel.send({ embeds: [embed], components: [buttons] });
        config.freepanelMessageId = msg.id;
        config.freepanelChannelId = interaction.channelId;
        saveConfig();

        await interaction.reply({ content: `✅ Posted **Free Panel Release Card** in ${interaction.channel}!`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
      }
      else if (commandName === 'closepanel') {
        config.freepanel = config.freepanel || {};
        config.freepanel.status = 'OFFLINE (CLOSED)';
        saveConfig();

        await updateLiveFreePanelMessage(interaction.guildId);

        await interaction.reply({
          content: `🔴 **FREE PANEL CLOSED SUCCESSFULLY!** Status set to **OFFLINE** and Key set to **EXPIRED** across the server!`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
      else if (commandName === 'openpanel') {
        const newKey = interaction.options.getString('key');
        config.freepanel = config.freepanel || {};
        config.freepanel.status = 'ONLINE (SAFE)';
        if (newKey) config.freepanel.key = newKey;
        saveConfig();

        await updateLiveFreePanelMessage(interaction.guildId);

        await interaction.reply({
          content: `🟢 **FREE PANEL IS NOW ONLINE & ACTIVE!** Status set to **ONLINE (SAFE)**!`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
      else if (commandName === 'setstatus') {
        const newStatus = interaction.options.getString('status');
        const newKey = interaction.options.getString('key');
        config.freepanel = config.freepanel || {};
        config.freepanel.status = newStatus;
        if (newKey) config.freepanel.key = newKey;
        saveConfig();

        await updateLiveFreePanelMessage(interaction.guildId);

        await interaction.reply({
          content: `⚙️ **PANEL STATUS UPDATED TO: \`${newStatus}\`!** Live post updated automatically.`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
      else {
        await interaction.reply({ content: 'Use `/postnow`, `/panel`, `/setup`, `/welcome`, `/setkey`, `/setfreepanel`, `/sendfreepanel`, `/closepanel`, `/openpanel`, or `/setstatus`!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
      }
    }

    else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'wizard_select_product') {
        const selectedProduct = interaction.values[0];
        const step2 = createPostWizardDurationMessage(selectedProduct);
        await interaction.update(step2);
      }
      else if (interaction.customId.startsWith('wizard_select_duration:')) {
        const selectedProduct = interaction.customId.split(':')[1];
        const selectedDuration = interaction.values[0];
        const securityStatus = SECURITY_STATUSES[Math.floor(Math.random() * SECURITY_STATUSES.length)];

        await interaction.deferUpdate();
        const result = await sendSellProof(selectedProduct, selectedDuration, securityStatus);

        if (result.success) {
          await interaction.editReply({ 
            embeds: [], 
            components: [], 
            content: `⚡ **SELL PROOF POSTED SUCCESSFULLY!**\n📦 **Product**: \`${selectedProduct}\`\n⏱️ **Duration**: \`${selectedDuration}\`\n📌 **Channel**: <#${config.targetChannelId}>` 
          });
        } else {
          await interaction.editReply({ content: `❌ Failed to post sell proof: **${result.reason}**`, embeds: [], components: [] });
        }
      }
      else if (interaction.customId === 'dashboard_toggle_product') {
        const selectedProduct = interaction.values[0];
        if (config.productsMap.hasOwnProperty(selectedProduct)) {
          config.productsMap[selectedProduct] = !config.productsMap[selectedProduct];
          saveConfig();
        }

        const updatedEmbed = createDashboardEmbed();
        const updatedComponents = createDashboardComponents();

        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
    }

    else if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 'dashboard_select_target_channel') {
        const selectedChannelId = interaction.values[0];
        config.targetChannelId = selectedChannelId;
        saveConfig();

        const updatedEmbed = createChannelsEmbed();
        const updatedComponents = createChannelsComponents();
        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
      else if (interaction.customId === 'dashboard_select_ticket_channel') {
        const selectedChannelId = interaction.values[0];
        config.ticketChannelId = selectedChannelId;
        saveConfig();

        const updatedEmbed = createChannelsEmbed();
        const updatedComponents = createChannelsComponents();
        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
      else if (interaction.customId === 'select_welcome_channel') {
        const selectedChannelId = interaction.values[0];
        config.welcomeChannelId = selectedChannelId;
        saveConfig();

        const updatedEmbed = createWelcomeDashboardEmbed();
        const updatedComponents = createWelcomeDashboardComponents();
        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
    }

    else if (interaction.isButton()) {
      if (interaction.customId.startsWith('wizard_custom_duration:')) {
        const selectedProduct = interaction.customId.split(':')[1];
        const modal = new ModalBuilder()
          .setCustomId(`modal_custom_duration:${selectedProduct}`)
          .setTitle(`Type Custom Duration for ${selectedProduct.slice(0, 15)}`);

        const durationInput = new TextInputBuilder()
          .setCustomId('custom_duration_input')
          .setLabel('Duration (e.g. 15 Days, Lifetime, 1 Month)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 15 Days')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
        await interaction.showModal(modal);
      }
      else if (interaction.customId === 'btn_toggle_auto') {
        config.autoPosterEnabled = !config.autoPosterEnabled;
        saveConfig();
        const updatedEmbed = createDashboardEmbed();
        const updatedComponents = createDashboardComponents();
        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
      else if (interaction.customId === 'btn_post_now') {
        const wizard = createPostWizardProductMessage();
        await interaction.reply({ ...wizard, flags: [MessageFlags.Ephemeral] });
      }
      else if (interaction.customId === 'btn_add_product_modal') {
        const modal = new ModalBuilder()
          .setCustomId('add_product_modal')
          .setTitle('➕ Add New Product');

        const nameInput = new TextInputBuilder()
          .setCustomId('product_name_input')
          .setLabel('Product Name')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. VIP-Mod-Menu')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
      }
      else if (interaction.customId === 'btn_fp_edit_master_modal') {
        const fp = config.freepanel || {};
        const modal = new ModalBuilder()
          .setCustomId('modal_fp_master_edit')
          .setTitle('✏️ Edit Name, Key & Secret Code');

        const nameInput = new TextInputBuilder()
          .setCustomId('m_name_input')
          .setLabel('Product / Panel Name')
          .setStyle(TextInputStyle.Short)
          .setValue(fp.name || 'BASIC PANNEL')
          .setRequired(true);

        const codeInput = new TextInputBuilder()
          .setCustomId('m_code_input')
          .setLabel('Ticket Secret Code (e.g. 1234)')
          .setStyle(TextInputStyle.Short)
          .setValue(fp.secret_code || '1234')
          .setRequired(true);

        const keyInput = new TextInputBuilder()
          .setCustomId('m_key_input')
          .setLabel('Release Key String')
          .setStyle(TextInputStyle.Short)
          .setValue(fp.key || 'SHIVAAY-FREE-KEY-2026')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(codeInput),
          new ActionRowBuilder().addComponents(keyInput)
        );

        await interaction.showModal(modal);
      }
      else if (interaction.customId === 'btn_fp_edit_urls_modal') {
        const fp = config.freepanel || {};
        const modal = new ModalBuilder()
          .setCustomId('modal_fp_urls_edit')
          .setTitle('🔗 Edit Download File Links');

        const loaderInput = new TextInputBuilder()
          .setCustomId('m_loader_input')
          .setLabel('📘 Loader File Link (URL)')
          .setStyle(TextInputStyle.Short)
          .setValue(fp.loader_link || 'https://discord.com')
          .setRequired(false);

        const apkInput = new TextInputBuilder()
          .setCustomId('m_apk_input')
          .setLabel('🎮 Free Fire APK Link (URL)')
          .setStyle(TextInputStyle.Short)
          .setValue(fp.apk_link || 'https://discord.com')
          .setRequired(false);

        const emulatorInput = new TextInputBuilder()
          .setCustomId('m_emulator_input')
          .setLabel('🪜 Emulator File Link (URL)')
          .setStyle(TextInputStyle.Short)
          .setValue(fp.emulator_link || 'https://discord.com')
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(loaderInput),
          new ActionRowBuilder().addComponents(apkInput),
          new ActionRowBuilder().addComponents(emulatorInput)
        );

        await interaction.showModal(modal);
      }
      else if (interaction.customId === 'btn_fp_toggle_code') {
        config.freepanel = config.freepanel || {};
        config.freepanel.codeEnabled = config.freepanel.codeEnabled === false ? true : false;
        saveConfig();

        const updatedEmbed = createFreePanelDashboardEmbed();
        const updatedComponents = createFreePanelDashboardComponents();
        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
      else if (interaction.customId === 'btn_fp_toggle_status') {
        config.freepanel = config.freepanel || {};
        const isClosed = config.freepanel.status && (config.freepanel.status.includes('OFFLINE') || config.freepanel.status.includes('CLOSED'));
        if (isClosed) {
          config.freepanel.status = 'ONLINE (SAFE)';
        } else {
          config.freepanel.status = 'OFFLINE (CLOSED)';
        }

        saveConfig();
        await updateLiveFreePanelMessage(interaction.guildId);

        const updatedEmbed = createFreePanelDashboardEmbed();
        const updatedComponents = createFreePanelDashboardComponents();
        await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
      }
      else if (interaction.customId === 'btn_fp_send_release') {
        const embed = createFreePanelEmbed(interaction.guildId);
        const buttons = createFreePanelButtons(interaction.guildId);

        const msg = await interaction.channel.send({ embeds: [embed], components: [buttons] });
        config.freepanelMessageId = msg.id;
        config.freepanelChannelId = interaction.channelId;
        saveConfig();

        await interaction.reply({ content: `🚀 **Posted Free Panel Release Embed in ${interaction.channel}!** Live status sync enabled.`, flags: [MessageFlags.Ephemeral] });
      }
      else if (interaction.customId === 'btn_welcome_setvideo_modal') {
        const modal = new ModalBuilder()
          .setCustomId('modal_welcome_setvideo')
          .setTitle('🖼️ Set Welcome Video / GIF Link');

        const urlInput = new TextInputBuilder()
          .setCustomId('welcome_video_input')
          .setLabel('Paste Video (.mp4) or GIF URL')
          .setStyle(TextInputStyle.Short)
          .setValue(config.welcomeGifUrl || '')
          .setPlaceholder('https://media.giphy.com/...')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
        await interaction.showModal(modal);
      }
      else if (interaction.customId === 'btn_welcome_test_card') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        await triggerFakeWelcome();
        await interaction.followUp({ content: `🧪 **Test Welcome Card sent directly to welcome channel!**`, flags: [MessageFlags.Ephemeral] });
      }
      else if (interaction.customId === 'btn_buy_paid_version') {
        let ticketUrl = 'https://discord.com';
        if (interaction.guildId && config.ticketChannelId) {
          ticketUrl = `https://discord.com/channels/${interaction.guildId}/${config.ticketChannelId}`;
        } else if (BUY_LINK && BUY_LINK.startsWith('http')) {
          ticketUrl = BUY_LINK;
        }

        await interaction.reply({
          content: `🛒 **NEED PAID VIP PANEL & MAXIMUM PROTECTION?**\n\n👉 **Click here to open an Order Ticket**: ${ticketUrl}`,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
    }

    else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_custom_duration:')) {
        const selectedProduct = interaction.customId.split(':')[1];
        const customDuration = interaction.fields.getTextInputValue('custom_duration_input').trim();
        const securityStatus = SECURITY_STATUSES[Math.floor(Math.random() * SECURITY_STATUSES.length)];

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const result = await sendSellProof(selectedProduct, customDuration, securityStatus);

        if (result.success) {
          await interaction.followUp({ 
            content: `⚡ **SELL PROOF POSTED SUCCESSFULLY!**\n📦 **Product**: \`${selectedProduct}\`\n⏱️ **Duration**: \`${customDuration}\`\n📌 **Channel**: <#${config.targetChannelId}>`,
            flags: [MessageFlags.Ephemeral]
          });
        } else {
          await interaction.followUp({ content: `❌ Failed to post sell proof: **${result.reason}**`, flags: [MessageFlags.Ephemeral] });
        }
      }
      else if (interaction.customId === 'add_product_modal') {
        const newName = interaction.fields.getTextInputValue('product_name_input').trim();
        if (newName) {
          config.productsMap[newName] = true;
          saveConfig();
        }
        await interaction.reply({ content: `✅ Added **${newName}** to active products list!`, flags: [MessageFlags.Ephemeral] });
      }
      else if (interaction.customId === 'modal_fp_master_edit') {
        const name = interaction.fields.getTextInputValue('m_name_input').trim();
        const code = interaction.fields.getTextInputValue('m_code_input').trim().toLowerCase();
        const key = interaction.fields.getTextInputValue('m_key_input').trim();

        config.freepanel = config.freepanel || {};
        if (name) config.freepanel.name = name;
        if (code) config.freepanel.secret_code = code;
        if (key) config.freepanel.key = key;

        if (code && key) {
          config.keysMap = config.keysMap || {};
          config.keysMap[code] = { product: name || 'Free Fire Panel', key: key, link: config.freepanel.loader_link || '' };
        }

        saveConfig();
        await updateLiveFreePanelMessage(interaction.guildId);

        await interaction.reply({
          content: `✅ **FREE PANEL NAME, KEY & SECRET CODE UPDATED!** 🎉\n` +
                   `📦 **Panel**: \`${name}\` | 🔑 **Key**: \`${key}\` | 🔒 **Code**: \`${code}\`\n\n` +
                   `*Live release post updated automatically!*`,
          flags: [MessageFlags.Ephemeral]
        });
      }
      else if (interaction.customId === 'modal_fp_urls_edit') {
        const loaderLink = interaction.fields.getTextInputValue('m_loader_input').trim();
        const apkLink = interaction.fields.getTextInputValue('m_apk_input').trim();
        const emulatorLink = interaction.fields.getTextInputValue('m_emulator_input').trim();

        config.freepanel = config.freepanel || {};
        if (loaderLink) config.freepanel.loader_link = loaderLink;
        if (apkLink) config.freepanel.apk_link = apkLink;
        if (emulatorLink) config.freepanel.emulator_link = emulatorLink;

        saveConfig();
        await updateLiveFreePanelMessage(interaction.guildId);

        await interaction.reply({
          content: `✅ **FREE PANEL DOWNLOAD FILE LINKS UPDATED!** 🎉\n\n` +
                   `📘 **Loader Link**: ${loaderLink || '`Not Set`'}\n` +
                   `🎮 **Free Fire APK Link**: ${apkLink || '`Not Set`'}\n` +
                   `🪜 **Emulator Link**: ${emulatorLink || '`Not Set`'}\n\n` +
                   `*Live release post buttons updated automatically!*`,
          flags: [MessageFlags.Ephemeral]
        });
      }
      else if (interaction.customId === 'modal_add_code') {
        const code = interaction.fields.getTextInputValue('code_val_input').trim().toLowerCase();
        const product = interaction.fields.getTextInputValue('code_prod_input').trim();
        const key = interaction.fields.getTextInputValue('code_key_input').trim();
        const link = interaction.fields.getTextInputValue('code_link_input').trim();

        config.keysMap = config.keysMap || {};
        config.keysMap[code] = { product, key, link };
        saveConfig();

        await interaction.reply({
          content: `✅ **TICKET REDEEM CODE \`${code}\` ADDED SUCCESSFULLY!** 🎉\n📦 **Product**: **${product}**\n🔑 **Key**: \`${key}\`\n\n*Members can now type \`/claim code:${code}\` or type \`${code}\` in tickets to claim key!*`,
          flags: [MessageFlags.Ephemeral]
        });
      }
      else if (interaction.customId === 'modal_welcome_setvideo') {
        const url = interaction.fields.getTextInputValue('welcome_video_input').trim();
        if (url) {
          config.welcomeGifUrl = url;
          config.welcomeVideoUrl = url;
          saveConfig();
        }

        await interaction.reply({
          content: `✅ **WELCOME VIDEO / GIF UPDATED SUCCESSFULLY!** 🎉\n📌 **URL**: ${url}`,
          flags: [MessageFlags.Ephemeral]
        });
      }
    }
  } catch (err) {
    console.error(`Error handling interaction:`, err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred while executing command.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const contentRaw = message.content || '';
  if (!contentRaw) return;

  const contentLower = contentRaw.trim().toLowerCase();
  config.keysMap = config.keysMap || {};
  const fpCode = (config.freepanel && config.freepanel.secret_code) ? config.freepanel.secret_code.toLowerCase().trim() : '1234';

  const words = contentLower.split(/\s+/);
  let codeMatch = null;

  if (contentLower === fpCode || words.includes(fpCode)) {
    codeMatch = fpCode;
  } else {
    for (const w of words) {
      const cleanW = w.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
      if (cleanW === fpCode) {
        codeMatch = fpCode;
        break;
      }
      if (config.keysMap && config.keysMap[cleanW]) {
        codeMatch = cleanW;
        break;
      }
    }
  }

  if (codeMatch) {
    if (config.freepanel && config.freepanel.codeEnabled === false) {
      const disabledData = createCodeDisabledEmbed(message.author.toString(), message.guild ? message.guild.id : null);
      await message.channel.send({
        content: `👋 ${message.author.toString()}`,
        embeds: [disabledData.embed],
        components: [disabledData.row]
      }).catch((err) => console.error('Error sending disabled response:', err));
      return;
    }

    const embed = createFreePanelEmbed(message.guild ? message.guild.id : null);
    const buttons = createFreePanelButtons(message.guild ? message.guild.id : null);

    await message.channel.send({
      content: `👋 ${message.author.toString()} **Here is your Free Panel Release & Direct Download Access! 🎉**`,
      embeds: [embed],
      components: [buttons]
    }).catch((err) => console.error('Error sending free panel response:', err));
  }
});

process.on('unhandledRejection', error => {
  console.error('Unhandled Rejection:', error);
});

if (!TOKEN || TOKEN === 'PASTE_YOUR_BOT_TOKEN_HERE') {
  console.error('❌ DISCORD_BOT_TOKEN missing in .env file!');
} else {
  client.login(TOKEN);
}
