import 'dotenv/config';
import fetch from 'node-fetch';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  fetch: fetch as any,
});

async function main() {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'hello' }]
    });
    console.log(res.choices[0].message.content);
  } catch(e) {
    console.error(e);
  }
}
main();
