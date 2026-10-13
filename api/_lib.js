// Funções compartilhadas pelas rotas da API (arquivos com "_" na frente não viram rota na Vercel)
import { Redis } from "@upstash/redis";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "bastidor_sessao";
const DURACAO_S = 30 * 24 * 60 * 60; // 30 dias logado no mesmo celular

export function conectar() {
  // Aceita os nomes que a integração da Vercel cria (KV_*) e os do Upstash direto (UPSTASH_*)
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

// USUARIOS = "maria:SenhaDaMaria, joao:SenhaDoJoao"  (usuário:senha, separados por vírgula)
export function lerUsuarios() {
  const mapa = new Map();
  for (const par of String(process.env.USUARIOS || "").split(",")) {
    const i = par.indexOf(":");
    if (i < 1) continue;
    const usuario = par.slice(0, i).trim().toLowerCase();
    const senha = par.slice(i + 1).trim();
    if (usuario && senha) mapa.set(usuario, senha);
  }
  return mapa;
}

const hash = s => createHash("sha256").update(String(s)).digest();
export const iguais = (a, b) => timingSafeEqual(hash(a), hash(b));

// Chave que assina o cookie. Mudar USUARIOS (ou SESSAO_SEGREDO) desconecta todo mundo.
function chave() {
  return process.env.SESSAO_SEGREDO || "bastidor:" + (process.env.USUARIOS || "");
}
const assinar = dados => createHmac("sha256", chave()).update(dados).digest("base64url");

export function criarCookie(usuario) {
  const dados = Buffer.from(JSON.stringify({ u: usuario, exp: Math.floor(Date.now() / 1000) + DURACAO_S })).toString("base64url");
  return `${COOKIE}=${dados}.${assinar(dados)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACAO_S}`;
}
export const cookieApagado = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// Devolve o usuário logado, ou null
export function sessao(req) {
  const bruto = String(req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="));
  if (!bruto) return null;
  const [dados, assinatura] = bruto.slice(COOKIE.length + 1).split(".");
  if (!dados || !assinatura || !iguais(assinatura, assinar(dados))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(dados, "base64url").toString());
    if (!u || !exp || exp < Date.now() / 1000) return null;
    if (!lerUsuarios().has(u)) return null; // usuário removido da lista perde o acesso
    return u;
  } catch { return null; }
}

// Escritas só aceitam JSON: um formulário de outro site não consegue mandar isso
export function pedidoJson(req) {
  return String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json");
}

export function ipDe(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
}
