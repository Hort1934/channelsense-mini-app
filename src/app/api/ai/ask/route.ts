import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function POST(req: NextRequest) {
  const { prompt, mode } = await req.json();

  let statsText = '';
  if (/найактивніший|активність|most active/i.test(prompt)) {
    const channelId = 'founders';
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/channels/?channel_ids=${channelId}&limit=100`,
      {
        headers: { 'x-api-key': NEYNAR_API_KEY! },
      }
    );
    const data = await res.json();

    // Підрахунок активності
    const userStats: Record<string, { username: string; count: number }> = {};
    for (const cast of data.casts) {
      const username = cast.author.username;
      if (!userStats[username]) {
        userStats[username] = { username, count: 0 };
      }
      userStats[username].count += 1;
    }

    // Топ-3 користувачі
    const topUsers = Object.values(userStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (topUsers.length > 0) {
      statsText = 'Ось активність за тиждень:\n' +
        topUsers.map((u, i) => `${i + 1}. ${u.username}: ${u.count} повідомлень`).join('\n');
    } else {
      statsText = 'Дані про активність за цей період відсутні.';
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