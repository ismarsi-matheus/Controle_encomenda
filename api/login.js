import { conectar, lerUsuarios, iguais, criarCookie, pedidoJson, ipDe } from "./_lib.js";

const MAX_TENTATIVAS = 8;      // erros de senha permitidos por aparelho...
const JANELA_S = 15 * 60;      // ...a cada 15 minutos

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ erro: "Método não permitido." }); }
  if (!pedidoJson(req)) return res.status(415).json({ erro: "Formato inválido." });

  const usuarios = lerUsuarios();
  if (!usuarios.size) return res.status(500).json({ erro: "Nenhum usuário cadastrado. Configure a variável USUARIOS na Vercel." });

  // O limite de tentativas usa o banco; se o banco estiver fora do ar, o login continua funcionando
  const redis = conectar();
  const chaveTentativas = "bastidor:login-erros:" + ipDe(req);
  const noBanco = async fn => { if (!redis) return null; try { return await fn(redis); } catch (e) { console.error(e); return null; } };
  const erros = Number(await noBanco(r => r.get(chaveTentativas))) || 0;
  if (erros >= MAX_TENTATIVAS) return res.status(429).json({ erro: "Muitas tentativas erradas. Espere 15 minutos e tente de novo." });

  const usuario = String(req.body?.usuario || "").trim().toLowerCase().slice(0, 60);
  const senha = String(req.body?.senha || "").slice(0, 200);
  const certa = usuarios.get(usuario);
  // Compara mesmo quando o usuário não existe, para não revelar quais usuários existem
  const ok = iguais(senha, certa ?? "\u0000usuario-inexistente") && certa !== undefined;

  if (!ok) {
    await noBanco(async r => { await r.incr(chaveTentativas); await r.expire(chaveTentativas, JANELA_S); });
    return res.status(401).json({ erro: "Usuário ou senha incorretos." });
  }

  await noBanco(r => r.del(chaveTentativas));
  res.setHeader("Set-Cookie", criarCookie(usuario));
  return res.status(200).json({ usuario });
}
