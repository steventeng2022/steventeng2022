const fs = require('node:fs/promises');

module.exports = async ({ github, context }) => {
  const login = context.repo.owner;
  const result = await github.graphql(`query($login: String!, $cursor: String) {
    user(login: $login) {
      login createdAt
      followers { totalCount }
      issues { totalCount }
      pullRequests { totalCount }
      contributionsCollection {
        totalCommitContributions totalPullRequestReviewContributions
      }
      repositories(first: 100, after: $cursor, privacy: PUBLIC, ownerAffiliations: OWNER) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { stargazerCount languages(first: 50) { nodes { name } } }
      }
    }
  }`, { login, cursor: null });
  const user = result.user;
  if (!user) throw new Error('GitHub profile was not found.');
  let repositories = [...user.repositories.nodes];
  let page = user.repositories;
  while (page.pageInfo.hasNextPage) {
    const next = await github.graphql(`query($login: String!, $cursor: String!) {
      user(login: $login) {
        repositories(first: 100, after: $cursor, privacy: PUBLIC, ownerAffiliations: OWNER) {
          pageInfo { hasNextPage endCursor }
          nodes { stargazerCount languages(first: 50) { nodes { name } } }
        }
      }
    }`, { login, cursor: page.pageInfo.endCursor });
    page = next.user.repositories;
    repositories.push(...page.nodes);
  }
  const languages = new Set(repositories.flatMap(repo => repo.languages.nodes.map(language => language.name)));
  const stars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  const age = Math.floor((Date.now() - Date.parse(user.createdAt)) / 86400000 / 100);
  const common = [1, 10, 20, 50, 100, 200, 500, 1000];
  const cards = [
    ['MultiLanguage', languages.size, [1, 3, 5, 7, 9, 10, 15, 20], ['First Language', 'Language Explorer', 'Versatile Coder', 'Polyglot', 'Language Enthusiast', 'Rainbow Lang User', 'Language Master', 'Language Veteran']],
    ['Commits', user.contributionsCollection.totalCommitContributions, [1, 10, 100, 200, 500, 1000, 2000, 4000], ['First Commit', 'Middle Committer', 'High Committer', 'Hyper Committer', 'Ultra Committer', 'Super Committer', 'Deep Committer', 'God Committer']],
    ['Stars', stars, [1, 10, 30, 50, 100, 200, 700, 2000], ['First Star', 'Middle Star', 'You are a Star', 'High Star', 'Super Star', 'Stargazer', 'High Stargazer', 'Super Stargazer']],
    ['Followers', user.followers.totalCount, [1, 10, 20, 50, 100, 200, 400, 1000], ['First Friend', 'Many Friends', 'Dynamic User', 'Active User', 'Famous User', 'Hyper Celebrity', 'Ultra Celebrity', 'Super Celebrity']],
    ['Issues', user.issues.totalCount, common, ['First Issue', 'Middle Issuer', 'High Issuer', 'Hyper Issuer', 'Ultra Issuer', 'Super Issuer', 'Deep Issuer', 'God Issuer']],
    ['PullRequest', user.pullRequests.totalCount, common, ['First Pull', 'Middle Puller', 'High Puller', 'Hyper Puller', 'Ultra Puller', 'Super Puller', 'Deep Puller', 'God Puller']],
    ['Repositories', user.repositories.totalCount, [1, 10, 20, 30, 35, 40, 45, 50], ['First Repository', 'Middle Repo Creator', 'High Repo Creator', 'Hyper Repo Creator', 'Ultra Repo Creator', 'Super Repo Creator', 'Deep Repo Creator', 'God Repo Creator']],
    ['Experience', age, [2, 6, 11, 18, 28, 40, 55, 70], ['Newbie', 'Junior Dev', 'Intermediate Dev', 'Experienced Dev', 'Expert Dev', 'Master Dev', 'Grandmaster', 'Seasoned Veteran']],
    ['Reviews', user.contributionsCollection.totalPullRequestReviewContributions, [1, 3, 8, 20, 30, 45, 57, 70], ['New Reviewer', 'Intermediate Reviewer', 'Active Reviewer', 'Hyper Reviewer', 'Ultra Reviewer', 'Super Reviewer', 'Deep Reviewer', 'God Reviewer']]
  ];
  const ranks = ['C', 'B', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[char]));
  const compact = value => value >= 1000 ? (value / 1000).toFixed(1).replace(/\\.0$/, '') + 'k' : String(value);
  const panels = cards.map(([title, score, thresholds, messages], index) => {
    let level = -1;
    thresholds.forEach((threshold, i) => { if (score >= threshold) level = i; });
    const rank = level < 0 ? '?' : ranks[level];
    const label = level < 0 ? 'Getting Started' : messages[level];
    const color = level >= 5 ? '#ebcb8b' : level >= 2 ? '#8fbcbb' : level === 1 ? '#d08770' : '#81a1c1';
    const progress = level === 7 ? 1 : level < 0 ? 0 : Math.min(1, (score - thresholds[level]) / (thresholds[level + 1] - thresholds[level]));
    return `<g transform="translate(${index * 124},0)">
      <rect width="115" height="115" rx="4" fill="#2e3440"/>
      <text x="57.5" y="17" fill="#81a1c1" font-size="12" font-weight="700">${escape(title)}</text>
      <g stroke="${color}" stroke-width="3" fill="none">
        <path d="M43 31H35C28 31 28 47 42 47M72 31H80C87 31 87 47 73 47"/>
        <path d="M39 25H76L72 44Q69 55 58 58Q47 55 44 44Z" fill="${color}"/>
        <path d="M58 57V68M48 69H68M45 73H71"/>
      </g>
      <circle cx="57.5" cy="39" r="14" fill="#e5e9f0" stroke="${color}" stroke-width="1"/>
      <text x="57.5" y="45" fill="#4c566a" font-family="Georgia,serif" font-size="${rank.length > 1 ? 13 : 20}">${rank}</text>
      <g fill="#a3be8c" opacity="${level >= 2 ? 1 : 0.35}">
        <path d="M43 64C33 61 29 54 29 47C35 50 37 54 36 58C39 56 41 59 43 64ZM72 64C82 61 86 54 86 47C80 50 78 54 79 58C76 56 74 59 72 64Z"/>
        <path d="M43 65C32 65 26 61 24 55C31 55 35 57 36 61C39 60 42 62 43 65ZM72 65C83 65 89 61 91 55C84 55 80 57 79 61C76 60 73 62 72 65Z"/>
      </g>
      <text x="57.5" y="85" fill="#eceff4" font-size="${label.length > 19 ? 8 : 9}" font-weight="700">${escape(label)}</text>
      <text x="57.5" y="98" fill="#eceff4" font-size="10" font-weight="700">${compact(score)}pt</text>
      <rect x="14" y="104" width="87" height="3" fill="#434c5e"/>
      <rect x="14" y="104" width="${(87 * progress).toFixed(2)}" height="3" fill="#81a1c1"/>
    </g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1107" height="115" viewBox="0 0 1107 115" role="img" aria-labelledby="title desc">
    <title id="title">${escape(login)} GitHub trophies</title>
    <desc id="desc">Public GitHub statistics. Commits and reviews cover the past year. Experience points represent 100 days of account age. Ranks are decorative milestones, with thresholds inspired by github-profile-trophy; language milestones are customized.</desc>
    <g font-family="Segoe UI,Helvetica,Arial,sans-serif" text-anchor="middle">${panels}</g>
  </svg>`;
  await fs.mkdir('dist', { recursive: true });
  await fs.writeFile('dist/trophy.svg', svg);
  console.log(JSON.stringify(cards.map(([title, score]) => ({ title, score }))));
};
