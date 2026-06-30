const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CHANNEL_ID = '@claude_banana_2025';

const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'openai/gpt-oss-20b:free',
  'nousresearch/hermes-3-405b-instruct:free'
];

function tgRequest(method, params) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function callAI(system, user) {
  for (const model of FREE_MODELS) {
    try {
      const postData = JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 800
      });
      const result = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'openrouter.ai',
          path: '/api/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://sankovskuuu-dotcom.github.io/claude-banana/',
            'X-Title': 'Claude + Banana Bot'
          }
        };
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
      if (result.choices?.[0]?.message?.content) return result.choices[0].message.content;
    } catch(e) { continue; }
  }
  return null;
}

const SYSTEM_POST = `ВАЖНО: Пиши ТОЛЬКО на русском языке!
Ты контент-менеджер Telegram-канала "Claude + Banana".
Создай вовлекающий пост на основе идеи пользователя.
Стиль: живой, энергичный, с эмодзи. Длина: 150-200 слов.
В конце добавь: 👉 Присоединяйся: https://t.me/+8sIpW4azEBJjYjhi
Только русский язык!`;

const SYSTEM_BOT = `ВАЖНО: Отвечай ТОЛЬКО на русском языке!
Ты AI-ассистент челленджа "Claude + Banana" 🍌
О челлендже: 3 дня, бесплатно, закрытый Telegram-канал
День 1: Prompting, День 2: Изображения и видео, День 3: Коннекторы
Результат: AI-команда закрывает 90% рутины
Сайт: https://sankovskuuu-dotcom.github.io/claude-banana/
Канал: https://t.me/+8sIpW4azEBJjYjhi
Команды: /idea [тема], /image [описание], /video [идея], /post, /stats
Стиль: дружелюбный, энергичный, на ты, с эмодзи. Только русский!`;

async function generateImage(prompt, chatId) {
  const englishPrompt = await callAI('Translate to English for image generation. Return ONLY the English prompt.', prompt) || prompt;
  const clean = englishPrompt.trim().replace(/\n/g, ' ').substring(0, 300);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean + ', digital art, AI theme, dark purple background, neon colors')}?width=1024&height=1024&nologo=true`;
  await tgRequest('sendPhoto', {
    chat_id: chatId,
    photo: url,
    caption: `🎨 Сгенерировано AI\n_Промпт: ${prompt.substring(0, 80)}_\n\n🍌 Claude + Banana`,
    parse_mode: 'Markdown'
  });
}

async function generateVideoStoryboard(prompt, chatId) {
  await tgRequest('sendMessage', { chat_id: chatId, text: `🎬 Создаю раскадровку видео (4 кадра)... ⏳` });
  const scenesRaw = await callAI('Break the user idea into exactly 4 short visual scenes for a video storyboard. Each scene on a new line, in English, very short (max 10 words). No numbering.', prompt) || prompt;
  const scenes = scenesRaw.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4);
  const finalScenes = scenes.length >= 2 ? scenes : [prompt, prompt + ' close up', prompt + ' wide shot', prompt + ' final scene'];
  for (let i = 0; i < finalScenes.length; i++) {
    const scenePrompt = finalScenes[i].substring(0, 200);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(scenePrompt + ', cinematic, digital art, AI theme, dark purple neon')}?width=1024&height=576&nologo=true&seed=${i}`;
    await tgRequest('sendPhoto', { chat_id: chatId, photo: url, caption: `🎬 Кадр ${i + 1}/${finalScenes.length}: ${scenePrompt}` });
  }
  await tgRequest('sendMessage', { chat_id: chatId, text: `✅ Раскадровка готова!\n\n💡 Собери видео из кадров в CapCut или Runway ML (День 2 челленджа).\n\n🍌 Claude + Banana` });
}

async function processMessage(update) {
  if (update.message?.new_chat_members) {
    for (const m of update.message.new_chat_members) {
      if (!m.is_bot) {
        const text = await callAI('ВАЖНО: Только русский язык! Напиши короткое тёплое приветствие (3 строки) для нового участника челленджа Claude + Banana.', `Поприветствуй ${m.first_name}`)
          || `👋 Привет, ${m.first_name}! Добро пожаловать в Claude + Banana!\n\nЗа 3 дня соберём твою AI-команду 🍌`;
        await tgRequest('sendMessage', { chat_id: update.message.chat.id, text });
      }
    }
    return;
  }

  if (!update.message?.text) return;

  const msg = update.message;
  const text = msg.text.trim();
  const chatId = msg.chat.id;
  const name = msg.from?.first_name || 'друг';

  if (text === '/start') {
    await tgRequest('sendMessage', {
      chat_id: chatId,
      text: `👋 Привет, ${name}! Я бот челленджа Claude + Banana 🍌\n\n` +
        `📝 /idea [тема] — опубликовать пост в канал\n` +
        `🎨 /image [описание] — сгенерировать картинку\n` +
        `🎬 /video [идея] — раскадровка видео\n` +
        `❓ Любой вопрос — отвечу!\n\n` +
        `🌐 Сайт: https://sankovskuuu-dotcom.github.io/claude-banana/`
    });
    return;
  }

  if (text.startsWith('/idea') || text.startsWith('/идея')) {
    const idea = text.replace(/^\/(idea|идея)\s*/i, '').trim();
    if (!idea) {
      await tgRequest('sendMessage', { chat_id: chatId, text: '💡 Напиши тему поста!\nПример: /idea AI помогает риелторам' });
      return;
    }
    await tgRequest('sendMessage', { chat_id: chatId, text: '✍️ Генерирую пост...' });
    const post = await callAI(SYSTEM_POST, idea);
    if (!post) { await tgRequest('sendMessage', { chat_id: chatId, text: '❌ Не удалось сгенерировать.' }); return; }
    const result = await tgRequest('sendMessage', { chat_id: CHANNEL_ID, text: post });
    if (result.ok) await tgRequest('sendMessage', { chat_id: chatId, text: `✅ Опубликовано в канале!` });
    else await tgRequest('sendMessage', { chat_id: chatId, text: `📝 Вот пост:\n\n${post}` });
    return;
  }

  if (text.startsWith('/image') || text.startsWith('/картинка') || text.startsWith('/фото')) {
    const prompt = text.replace(/^\/(image|картинка|фото)\s*/i, '').trim();
    if (!prompt) { await tgRequest('sendMessage', { chat_id: chatId, text: '🎨 Напиши что нарисовать!' }); return; }
    await tgRequest('sendMessage', { chat_id: chatId, text: '🎨 Генерирую... ⏳' });
    await generateImage(prompt, chatId);
    return;
  }

  if (text.startsWith('/video') || text.startsWith('/видео')) {
    const prompt = text.replace(/^\/(video|видео)\s*/i, '').trim();
    if (!prompt) { await tgRequest('sendMessage', { chat_id: chatId, text: '🎬 Напиши идею для видео!' }); return; }
    await generateVideoStoryboard(prompt, chatId);
    return;
  }

  if (text === '/post' || text === '/контент') {
    await tgRequest('sendMessage', { chat_id: chatId, text: '📝 Генерирую пост...' });
    const post = await callAI(SYSTEM_POST, 'Напиши интересный пост про AI и автоматизацию');
    await tgRequest('sendMessage', { chat_id: chatId, text: post || 'Не удалось 🙏' });
    return;
  }

  if (text === '/help' || text === '/помощь') {
    await tgRequest('sendMessage', {
      chat_id: chatId,
      text: `🤖 Claude + Banana Bot\n\n💡 /idea [тема]\n🎨 /image [описание]\n🎬 /video [идея]\n📝 /post\n\nИли просто напиши вопрос! 🍌`
    });
    return;
  }

  if (!text.startsWith('/')) {
    const reply = await callAI(SYSTEM_BOT, text);
    await tgRequest('sendMessage', { chat_id: chatId, text: reply || 'Временно недоступен 🙏', reply_to_message_id: msg.message_id });
  }
}

(async () => {
  try {
    const offsetResult = await tgRequest('getUpdates', { limit: 1, offset: -1 });
    let lastUpdateId = 0;

    const updates = await tgRequest('getUpdates', { timeout: 0, limit: 50 });
    if (updates.ok && updates.result.length > 0) {
      console.log(`Processing ${updates.result.length} updates`);
      for (const update of updates.result) {
        await processMessage(update);
        lastUpdateId = update.update_id;
      }
      // Confirm processed updates so they don't repeat
      await tgRequest('getUpdates', { offset: lastUpdateId + 1, limit: 1 });
      console.log('Done processing updates');
    } else {
      console.log('No new updates');
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
