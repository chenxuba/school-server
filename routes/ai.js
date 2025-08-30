const express = require('express');
const router = express.Router();

// Use OpenAI SDK with DeepSeek-compatible base URL
const OpenAI = require('openai');
// import OpenAI from "openai";

const apiKey = "sk-3153518fffd24b1588d7b914c388320d";
const baseURL = 'https://api.deepseek.com';

const client = new OpenAI({
  apiKey,
  baseURL
});

// POST /api/ai/chat
// body: { messages: [{ role: 'user'|'system'|'assistant', content: string }], model?: string, stream?: boolean }
router.post('/chat', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ code: 500, message: 'Missing DEEPSEEK_API_KEY' });
    }

    const { messages, model, stream = true } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ code: 400, message: 'messages is required' });
    }

    const chatModel = model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (stream) {
      // 流式输出
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await client.chat.completions.create({
        model: chatModel,
        messages,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(content);
        }
      }
      res.end();
    } else {
      // 非流式输出
      const completion = await client.chat.completions.create({
        model: chatModel,
        messages,
      });

      const choice = completion && completion.choices && completion.choices[0];
      const content = choice && choice.message && choice.message.content;

      return res.json({
        code: 200,
        message: 'ok',
        data: {
          model: completion.model,
          id: completion.id,
          content: content || ''
        }
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    const status = error.status || 500;
    if (req.body?.stream) {
      res.status(status).end();
    } else {
      return res.status(status).json({ code: status, message: error.message || 'AI service error' });
    }
  }
});

module.exports = router;


