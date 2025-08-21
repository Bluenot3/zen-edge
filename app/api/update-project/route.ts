import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { appConfig } from '@/config/app.config';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { id, instruction, model } = await req.json() as { id: string; instruction: string; model?: string };
    if (!id || !instruction) return NextResponse.json({ error: 'Missing id or instruction' }, { status: 400 });

    const baseDir = path.join(process.cwd(), 'public', 'generated', id);
    const [html, css, js] = await Promise.all([
      readFile(path.join(baseDir, 'index.html'), 'utf8'),
      readFile(path.join(baseDir, 'styles.css'), 'utf8'),
      readFile(path.join(baseDir, 'script.js'), 'utf8'),
    ]);

    const modelName = model || appConfig.ai.defaultModel;
    const isAnthropic = modelName.startsWith('anthropic/');
    const isGoogle = modelName.startsWith('google/');
    const isOpenAI = modelName.startsWith('openai/');
    const modelProvider = isAnthropic
      ? anthropic
      : isOpenAI
        ? openai
        : isGoogle
          ? google
          : groq;
    const actualModel = modelName.replace(/^(anthropic|google|openai|groq)\//, '');

    const { text } = await generateText({
      model: modelProvider(actualModel),
      temperature: 0.4,
      system: `You are a precise code refactoring engine. \\
Given current HTML/CSS/JS and a user instruction, return UPDATED code for ALL THREE files.\\
Return three fenced blocks in this exact order: html, css, javascript. No commentary.`,
      prompt: `USER INSTRUCTION:\n${instruction}\n\nCURRENT index.html:\n${html}\n\nCURRENT styles.css:\n${css}\n\nCURRENT script.js:\n${js}\n`,
    });

    const match = text.matchAll(/```(html|css|javascript)\s*([\s\S]*?)```/gi);
    let newHtml = '', newCss = '', newJs = '';
    for (const m of match) {
      const lang = (m[1] || '').toLowerCase();
      const body = m[2] || '';
      if (lang === 'html') newHtml = body.trim();
      else if (lang === 'css') newCss = body.trim();
      else if (lang === 'javascript') newJs = body.trim();
    }
    if (!newHtml || !newCss || !newJs) {
      return NextResponse.json({ error: 'Model returned unexpected format.' }, { status: 500 });
    }

    await Promise.all([
      writeFile(path.join(baseDir, 'index.html'), newHtml, 'utf8'),
      writeFile(path.join(baseDir, 'styles.css'), newCss, 'utf8'),
      writeFile(path.join(baseDir, 'script.js'), newJs, 'utf8'),
    ]);

    return NextResponse.json({ ok: true, previewUrl: `/generated/${id}/index.html` });
  } catch (err: any) {
    console.error('update-project error', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

