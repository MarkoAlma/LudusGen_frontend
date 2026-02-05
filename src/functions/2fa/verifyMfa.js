export const verifyMfa = async (req, res) => {
  const { token } = req.body;
  const secret = await getUserSecret(req.user.uid);

  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    return res.status(401).json({ error: "INVALID_MFA_CODE" });
  }

  // ✅ opcionális: Firebase custom claim
  await admin.auth().setCustomUserClaims(req.user.uid, {
    mfa: true,
  });

  res.json({ ok: true });
};
