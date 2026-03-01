import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSystemSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireRole('viewer');
  if (auth instanceof NextResponse) return auth;

  const [token, repo] = await Promise.all([
    getSystemSetting('github_token'),
    getSystemSetting('github_repo'),
  ]);

  if (!token || !repo) {
    return NextResponse.json(
      { error: 'GitHub issue reporting is not configured. Please ask your administrator to add a GitHub token and repo in System Settings.' },
      { status: 503 },
    );
  }

  const body = await req.json() as {
    type:        string;
    title:       string;
    description: string;
    pageUrl?:    string;
  };

  const { type, title, description, pageUrl } = body;
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
  }

  const labelMap: Record<string, string> = {
    bug:     'bug',
    feature: 'enhancement',
    other:   'question',
  };
  const label  = labelMap[type] ?? 'question';
  const typeLabel = type === 'bug' ? 'Bug' : type === 'feature' ? 'Feature Request' : 'Other';

  const issueBody = [
    description.trim(),
    '',
    '---',
    `**Type:** ${typeLabel}`,
    pageUrl ? `**Page:** ${pageUrl}` : null,
    `**Reporter:** ${auth.email}`,
    `**Submitted:** ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');

  const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method:  'POST',
    headers: {
      'Authorization':        `Bearer ${token}`,
      'Accept':               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':         'application/json',
    },
    body: JSON.stringify({ title: title.trim(), body: issueBody, labels: [label] }),
  });

  if (!ghRes.ok) {
    const detail = await ghRes.text().catch(() => '');
    console.error('GitHub API error:', ghRes.status, detail);
    return NextResponse.json({ error: `Could not create issue (GitHub error ${ghRes.status}).` }, { status: 502 });
  }

  const issue = await ghRes.json() as { html_url: string; number: number };
  return NextResponse.json({ ok: true, url: issue.html_url, number: issue.number });
}
