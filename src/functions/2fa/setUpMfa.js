import speakeasy from "speakeasy";
import QRCode from "qrcode";

export const setupMfa = async (req, res) => {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `AppNeved (${req.user.email})`,
  });

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  // 🔐 mentsd el secret.base32-t (titkosítva!)
  await saveUserSecret(req.user.uid, secret.base32);

  res.json({ qr });
};
