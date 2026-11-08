const levelSteps = [
  { name: "Newcomer", description: "Every shared skill starts with a first step.", min: 0, next: 100 },
  { name: "Explorer", description: "You are building momentum through learning.", min: 100, next: 250 },
  { name: "Contributor", description: "Your contributions are helping the community grow.", min: 250, next: 500 },
  { name: "Mentor", description: "Your knowledge and consistency make a difference.", min: 500, next: 1000 },
  { name: "Community Champion", description: "You have reached the highest SkillSwap level.", min: 1000, next: null },
];

const badges = [
  { id: "first-steps", name: "First Steps", requirement: "Complete your first exchange.", key: "completedExchanges", target: 1, test: (s) => s.completedExchanges >= 1 },
  { id: "skill-sharer", name: "Skill Sharer", requirement: "Complete a teaching contribution.", key: "teachingContributions", target: 1, test: (s) => s.teachingContributions >= 1 },
  { id: "curious-mind", name: "Curious Mind", requirement: "Complete a learning contribution.", key: "learningContributions", target: 1, test: (s) => s.learningContributions >= 1 },
  { id: "knowledge-builder", name: "Knowledge Builder", requirement: "Complete five exchanges.", key: "completedExchanges", target: 5, test: (s) => s.completedExchanges >= 5 },
  { id: "dedicated-learner", name: "Dedicated Learner", requirement: "Complete five learning contributions.", key: "learningContributions", target: 5, test: (s) => s.learningContributions >= 5 },
  { id: "helpful-mentor", name: "Helpful Mentor", requirement: "Complete ten teaching contributions.", key: "teachingContributions", target: 10, test: (s) => s.teachingContributions >= 10 },
  { id: "community-star", name: "Community Star", requirement: "Earn 500 SkillSwap Credits.", key: "credits", target: 500, test: (s) => s.credits >= 500 },
  { id: "community-champion", name: "Community Champion", requirement: "Earn 1,000 SkillSwap Credits.", key: "credits", target: 1000, test: (s) => s.credits >= 1000 },
];

export function levelForCredits(value) {
  const credits = Math.max(0, Number(value) || 0);
  const level = [...levelSteps].reverse().find((step) => credits >= step.min) || levelSteps[0];
  return {
    name: level.name,
    description: level.description,
    currentLevelAt: level.min,
    nextLevelAt: level.next,
    progress: level.next ? Math.min(100, Math.round(((credits - level.min) / (level.next - level.min)) * 100)) : 100,
  };
}

export function achievementsFor(stats) {
  return badges.map(({ test, key, target, ...badge }) => {
    const current = Number(stats[key] || 0);
    const earned = test(stats);
    return { ...badge, current, target, progress: earned ? 100 : Math.min(100, Math.round((current / target) * 100)), earned };
  });
}

export async function getCreditSummary(client, userId) {
  const { rows } = await client.query(`
    SELECT
      COALESCE(SUM(amount), 0)::int AS credits,
      COALESCE(SUM(amount) FILTER (WHERE activity_type='learning' AND transaction_type='earning'), 0)::int AS learning_credits,
      COALESCE(SUM(amount) FILTER (WHERE activity_type='teaching' AND transaction_type='earning'), 0)::int AS teaching_credits,
      COUNT(*) FILTER (WHERE activity_type='learning' AND transaction_type='earning')::int AS learning_contributions,
      COUNT(*) FILTER (WHERE activity_type='teaching' AND transaction_type='earning')::int AS teaching_contributions
    FROM credit_transactions WHERE user_id=$1`, [userId]);
  const exchanges = await client.query(`SELECT COUNT(*)::int AS count FROM swap_requests WHERE status='completed' AND (sender_id=$1 OR receiver_id=$1)`, [userId]);
  const stats = {
    credits: rows[0].credits,
    learningCredits: rows[0].learning_credits,
    teachingCredits: rows[0].teaching_credits,
    learningContributions: rows[0].learning_contributions,
    teachingContributions: rows[0].teaching_contributions,
    completedExchanges: exchanges.rows[0].count,
  };
  return { ...stats, level: levelForCredits(stats.credits), achievements: achievementsFor(stats) };
}

export const CREDIT_DISCLAIMER = "SkillSwap Credits are participation recognition only. They are not money, have no cash value, cannot be transferred or redeemed, and do not guarantee teaching quality.";
