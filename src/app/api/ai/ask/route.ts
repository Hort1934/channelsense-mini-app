import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function POST(req: NextRequest) {
  const { prompt, mode } = await req.json();

  let statsText = '';

  // Гнучке розпізнавання каналу з промпта
  let channelName = 'founders'; // default
  const slashMatch = prompt.match(/\/(\w+)/);
  const wordMatch = prompt.match(/(?:канал[і]?|channel)\s+([a-zA-Z0-9_]+)/i);

  if (slashMatch) {
    channelName = slashMatch[1];
  } else if (wordMatch) {
    channelName = wordMatch[1];
  }

  try {
    // 1. Отримання інформації про канал
    const channelResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/channel/?id=${channelName}`,
      {
        headers: { 'x-api-key': NEYNAR_API_KEY! },
      }
    );

    if (channelResponse.ok) {
      await channelResponse.json(); // не використовуємо channelData

      // 2. Отримання кастів каналу
      const feedResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/feed/channels/?channel_ids=${channelName}&limit=100`,
        {
          headers: { 'x-api-key': NEYNAR_API_KEY! },
        }
      );

      if (feedResponse.ok) {
        const feedData = await feedResponse.json();

        // 3. Аналіз активності
        if (/найактивніший|активність|most active/i.test(prompt)) {
          const userStats: Record<string, { username: string; count: number }> = {};
          for (const cast of feedData.casts) {
            const username = cast.author.username;
            if (!userStats[username]) {
              userStats[username] = { username, count: 0 };
            }
            userStats[username].count += 1;
          }
          const topUsers = Object.values(userStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

          if (topUsers.length > 0) {
            statsText = `Активність в каналі /${channelName}:\n` +
              topUsers.map((u, i) => `${i + 1}. ${u.username}: ${u.count} повідомлень`).join('\n');
          } else {
            statsText = `Дані про активність у /${channelName} відсутні.`;
          }
        }

        // 4. Пошук кастів про співзасновників
        if (/need cofounders|потрібні співзасновники/i.test(prompt)) {
          const cofounderCasts = feedData.casts.filter(cast =>
            /cofounder|співзасновник|looking for|шукаю/i.test(cast.text)
          );
          statsText = `Знайдено ${cofounderCasts.length} повідомлень про пошук співзасновників в /${channelName}:\n` +
            cofounderCasts.slice(0, 5).map(cast =>
              `- ${cast.author.username}: ${cast.text.substring(0, 100)}...`
            ).join('\n');
        }
      } else {
        statsText = `Не вдалося отримати касти для каналу /${channelName}`;
      }
    } else {
      statsText = `Канал /${channelName} не знайдено.`;
    }
  } catch (error) {
    console.error('Error fetching channel data:', error);
    statsText = `Помилка при отриманні даних каналу /${channelName}`;
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