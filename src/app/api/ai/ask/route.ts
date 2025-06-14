import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function POST(req: NextRequest) {
  const { prompt, mode } = await req.json();

  // Якщо питання про активність, підтягуємо статистику з Neynar
  let statsText = '';
  if (/найактивніший|активність/i.test(prompt)) {
    // Замість CHANNEL_ID підставте ваш id каналу
    const channelId = 'farcaster';
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/channel/${channelId}/activity?timeframe=7d`,
      {
        headers: { 'api_key': NEYNAR_API_KEY! },
      }
    );
    const data = await res.json();

    // Формуємо текст для prompt
    if (data && data.top_users) {
      statsText = 'Ось активність за тиждень:\n' +
        data.top_users
          .map((u: any, i: number) => `${i + 1}. ${u.username}: ${u.message_count} повідомлень`)
          .join('\n');
    }
  }

  const messages = [
    {
      role: 'user',
      content: `${statsText}\n\n${generatePrompt(prompt, mode)}`,
    },
  ];

  const aiRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-medium',
      messages,
      temperature: 0.7,
    }),
  });

  const aiData = await aiRes.json();
  const answer = aiData.choices?.[0]?.message?.content || 'Відповідь не знайдена';
  return NextResponse.json({ result: answer });
}

function generatePrompt(userPrompt: string, mode: string) {
  switch (mode) {
    case 'analytics':
      return `Відповідай на основі статистики активності. Користувач запитав: ${userPrompt}`;
    case 'admin':
      return `Ти асистент для адміністратора каналу. Запит: ${userPrompt}`;
    case 'summary':
      return `Підсумуй ключові події чи теми. Запит: ${userPrompt}`;
    default:
      return userPrompt;
  }
}