export function getProfileDisplayName(profile, fallback = "Anonymous") {
  return (
    profile?.displayName ||
    profile?.name ||
    profile?.email?.split?.("@")?.[0] ||
    fallback
  );
}

export function getProfileAvatarUrl(profile) {
  return profile?.profilePicture || profile?.photoURL || profile?.avatarUrl || null;
}

export function getProfileInitial(profile, fallbackName = "Anonymous") {
  const name = getProfileDisplayName(profile, fallbackName);
  return (name?.[0] || "?").toUpperCase();
}

export function applyProfileToForumPost(post, profile) {
  if (!post || !profile) return post;

  const author = getProfileDisplayName(profile, post.author || post.authorName || "Anonymous");
  const avatarUrl = getProfileAvatarUrl(profile);

  return {
    ...post,
    author,
    authorName: author,
    avatar: getProfileInitial(profile, author),
    avatarUrl,
    authorPhotoUrl: avatarUrl,
  };
}

export function applyProfileToForumComment(comment, profile) {
  if (!comment || !profile) return comment;

  const author = getProfileDisplayName(profile, comment.author || comment.authorName || "User");
  const avatarUrl = getProfileAvatarUrl(profile);

  return {
    ...comment,
    author,
    authorName: author,
    avatar: getProfileInitial(profile, author),
    avatarUrl,
  };
}

export async function fetchPublicProfile(apiBase, uid, token) {
  if (!apiBase || !uid || !token) return null;

  const response = await fetch(`${apiBase}/api/get-public-profile/${uid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const result = await response.json();
  return result?.success ? result.user : null;
}
