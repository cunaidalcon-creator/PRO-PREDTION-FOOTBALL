// LLM-powered insights (optional). Falls back to heuristic if LLM disabled.
export async function getAIInsight(match) {
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Responda em português de forma objetiva. Dê 2-3 linhas com: tendência de gols, risco do mercado e recomendação 1X2/Over2.5/BTTS. Seja sucinto.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Analise o jogo: ${match.home} vs ${match.away}, liga ${match.league} (${match.country}). ` +
                `Probabilidades: 1=${match.probs["1"]}% X=${match.probs["X"]}% 2=${match.probs["2"]}%. ` +
                `Média de gols: ${match.goalsAvg}. Odds: 1=${match.odds["1"]}, X=${match.odds["X"]}, 2=${match.odds["2"]}, O2.5=${match.odds.O25}, U2.5=${match.odds.U25}, BTTS=${match.odds.BTTS}.`,
            },
          ],
        },
      ],
    });
    return completion.content.trim();
  } catch {
    const strong = match.probs["1"] > 45 ? "1" : match.probs["2"] > 45 ? "2" : "Over 2.5";
    return `Tendência: gols médios ${match.goalsAvg}. Recomendo ${strong} com gestão de banca conservadora.`;
  }
}

