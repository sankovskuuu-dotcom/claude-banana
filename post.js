const https = require('https');

const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'openai/gpt-oss-20b:free'
];

const TOPICS = [
  'Напиши пост про пользу промптинга для бизнеса с конкретными примерами.',
  'Напиши пост про то как AI экономит время. Добавь цифры.',
  'Напиши мотивационный пост для тех кто хочет изучить AI.',
  'Напиши пост про инструменты AI для создания видео контента.',
  'Напиши пост про автоматизацию рутины с помощью AI.',
  'Напиши пост-кейс: человек внедрил AI и что изменилось в его жизни.',
  'Напиши пост про Canva AI и как им пользоваться.',
  'Напиши пост про промпты для создания контента в Instagram.',
  'Напиши пост про то как AI помогает фрилансерам зарабатывать больше.'
];

const SYSTEM = 'ВАЖНО: Пиши ТОЛЬКО на русском языке! Ты контент-менеджер Telegram-канала Claude + Banana. Создаёшь вовлекающие посты об AI. Стиль: живой, энергичный, с эмодзи. Длина: 150-200 слов. В конце добавь: 👉 Присоединяйся: https://t.me/+8sIpW4azEBJjYjhi';

const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function callAI() {
  for (const model of FREE_MODELS) {
    try {
      const body = JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: topic }
        ],
        max_tokens: 600
      });
      const result = await request({
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
          'HTTP-Referer': 'https://sankovskuuu-dotcom.github.io/claude-banana/',
          'X-Title': 'Claude + Banana Bot'
        }
      }, body);
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return result.choices[0].message.content;
      }
    } catch(e) {
      console.log('Model failed:', model, e.message);
      continue;
    }
  }
  return null;
}

async function sendToTelegram(text) {
  const body = JSON.stringify({
    chat_id: process.env.CHANNEL_ID,
    text: text
  });
  return request({
    hostname: 'api.telegram.org',
    path: '/bot' + process.env.BOT_TOKEN + '/sendMessage',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
}

(async () => {
  console.log('Generating post about:', topic);
  const post = await callAI();
  if (!post) {
    console.log('Failed to generate post');
    process.exit(1);
  }
  console.log('Post generated, sending to Telegram...');
  const result = await sendToTelegram(post);
  if (result.ok) {
    console.log('SUCCESS! Post published to channel.');
  } else {
    console.log('Telegram error:', JSON.stringify(result));
    process.exit(1);
  }
})();
