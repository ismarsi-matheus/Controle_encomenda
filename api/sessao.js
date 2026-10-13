import { sessao } from "./_lib.js";

// Diz se o aparelho está logado; a página de pedidos manda para /login se não estiver
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const usuario = sessao(req);
  if (!usuario) return res.status(401).json({ erro: "Não está logado." });
  return res.status(200).json({ usuario });
}
