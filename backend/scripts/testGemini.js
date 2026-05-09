require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Reply with JSON: {"ok": true}' }],
  response_format: { type: 'json_object' },
  max_tokens: 20,
}).then(r => {
  console.log('OpenAI OK:', r.choices[0].message.content);
  console.log('Model:', r.model);
}).catch(err => {
  console.error('OpenAI ERROR:', err.status, err.message);
});
