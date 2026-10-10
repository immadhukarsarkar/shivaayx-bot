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
  }
};

let lastPickedProduct = null;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const loaded = JSON.parse(raw);
      config = { ...config, ...loaded };
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
  } catch (err) {
    console.error('Error saving config.json:', err);
  }
}

loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
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

async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('postnow')
      .setDescription('Interactive wizard to choose product & duration and post sell proof')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('panel')
      .setDescription('Open the Interactive Products & Auto-Poster Control Panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Open the Interactive Channel Setup Popup')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('welcome')
      .setDescription('Post a Welcome Card in welcome channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('setvideo')
      .setDescription('Upload or set a video/GIF for the Welcome Card directly from Discord')
      .addAttachmentOption(option =>
        option.setName('file')
          .setDescription('Upload a Video (.mp4) or Animated GIF file directly')
          .setRequired(false)
      )
      .addStringOption(option =>
        option.setName('url')
          .setDescription('Or paste a Video or GIF link URL')
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
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
  const ticketText = config.ticketChannelId ? `<#${config.ticketChannelId}>` : '`#ticket`';
  const rulesText = config.rulesChannelId ? `<#${config.rulesChannelId}>` : '`rules`';

  const embed = new EmbedBuilder()
    .setColor(0x00F0FF) // Neon Cyan
    .setTitle(`⚡ WELCOME TO ${brand}`)
    .setDescription(
      `Hey ${userMention}, welcome to **${brand}**.\n\n` +
      `A clean community for **Gaming • Panels • Services & More.**\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📜 **Rules**\n` +
      `Please read the server rules in ${rulesText} before chatting.\n\n` +
      `🎫 **Support**\n` +
      `Need help or want to order something?\n` +
      `Create a ticket in ${ticketText}.\n\n` +
      `Enjoy your stay. 🖤`
    )
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
  const msgPayload = { content: `👋 Welcome ${userMention}!`, embeds: [embed] };
  if (config.welcomeVideoUrl && config.welcomeVideoUrl.startsWith('http')) {
    try {
      const attachment = new AttachmentBuilder(config.welcomeVideoUrl);
      msgPayload.files = [attachment];
    } catch (err) {
      console.error('Error attaching video:', err.message);
    }
  }
  await channel.send(msgPayload).catch(() => {});
}

async function triggerFakeWelcome() {
  if (!client.guilds.cache.size) return;
  const guild = client.guilds.cache.get(config.allowedGuildId) || client.guilds.cache.first();
  if (!guild) return;

  const channel = findWelcomeChannel(guild);
  if (!channel) return;

  const fakeUserId = (1300000000000000000n + BigInt(Math.floor(Math.random() * 299999999999999))).toString();
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
      else if (commandName === 'panel') {
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
        await interaction.reply({ content: `⏳ Triggering **Welcome Card**...`, flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const channel = findWelcomeChannel(interaction.guild);
        if (!channel) {
          await interaction.editReply({ content: '❌ Could not find welcome channel! Set `#welcome` channel ID.' }).catch(() => {});
          return;
        }

        await triggerFakeWelcome();
        await interaction.editReply({ content: `✅ Posted **Welcome Card** in ${channel}!` }).catch(() => {});
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
      else {
        await interaction.reply({ content: 'Use `/postnow` to post, `/panel` for products, `/setup` for channels, `/welcome` for welcome card, or `/setvideo` to upload video!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
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
    }
  } catch (err) {
    console.error(`Error handling interaction:`, err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred while executing command.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
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
