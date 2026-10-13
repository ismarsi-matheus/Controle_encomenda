import { cookieApagado } from "./_lib.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ erro: "Método não permitido." }); }
  res.setHeader("Set-Cookie", cookieApagado());
  return res.status(200).json({ ok: true });
}
