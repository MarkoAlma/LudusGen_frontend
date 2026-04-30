<<<<<<< HEAD
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseApp';

export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Hate speech',
  'NSFW content',
  'Copyright violation',
  'Scam or fraud',
  'Misinformation',
  'Other',
];

function trimText(value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, maxLength);
}

export async function submitContentReport({
  sourceType,
  targetId,
  targetPath = '',
  targetTitle = '',
  targetOwnerId = '',
  reason,
  details = '',
  metadata = {},
} = {}) {
  if (!sourceType) throw new Error('Missing report source type');
  if (!targetId) throw new Error('Missing report target');
  if (!reason) throw new Error('Select a report reason');

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Sign in to submit a report');

  const payload = {
    sourceType: trimText(sourceType, 80),
    targetId: trimText(targetId, 200),
    targetPath: trimText(targetPath || globalThis?.location?.pathname || '', 500),
    targetTitle: trimText(targetTitle, 200),
    targetOwnerId: trimText(targetOwnerId, 200),
    reason: trimText(reason, 80),
    details: trimText(details, 2000),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
    reporterId: currentUser.uid,
    reporterEmail: trimText(currentUser.email, 200),
    reporterName: trimText(currentUser.displayName, 200),
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await addDoc(collection(db, 'contentReports'), payload);
  return payload;
}

export default submitContentReport;
=======
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
>>>>>>> 946a854dc804346fde6d3d4b8686910db85a9f33
