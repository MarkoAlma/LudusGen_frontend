import { API_BASE } from '../api/client';
import { auth } from '../firebase/firebaseApp';

export const REPORT_REASONS = [
  'Spam or advertising',
  'Abusive or harassing content',
  'Misleading information',
  'Copyright violation',
  'Other',
];

export async function submitContentReport(payload) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  if (!token) throw new Error('Sign in to submit a report');

  const res = await fetch(`${API_BASE}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to submit report');
  }
  return data;
}
