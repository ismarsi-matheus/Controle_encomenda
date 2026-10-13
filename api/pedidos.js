import { randomUUID } from "node:crypto";
import { conectar, sessao, pedidoJson } from "./_lib.js";

// Todos os pedidos ficam num único hash do Redis: campo = id do pedido, valor = pedido (JSON)
const CHAVE = "bastidor:pedidos";

const CAMPOS_TEXTO = ["loja", "cliente", "telefone", "produto", "corPeca", "bordado", "local", "tamanho", "tecnica", "fonte", "corLinha", "prazo", "status", "obs", "condicao", "forma"];
const CAMPOS_NUMERO = ["qtd", "valor", "pago", "parcelas"];
const LOJAS = ["bordados", "papelaria"];
const ETAPAS = ["a_fazer", "bordando", "pronto", "entregue"];

const ler = v => (typeof v === "string" ? JSON.parse(v) : v) || {};

// Mantém só os campos conhecidos que vieram no corpo (serve para criar, substituir e alterar)
function limpar(dados) {
  const out = {};
  if (!dados || typeof dados !== "object") return out;
  for (const k of CAMPOS_TEXTO) if (k in dados) out[k] = String(dados[k] ?? "").trim().slice(0, 2000);
  for (const k of CAMPOS_NUMERO) if (k in dados) { const n = Number(dados[k]); out[k] = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; }
  if ("entregueEm" in dados) out.entregueEm = typeof dados.entregueEm === "string" ? dados.entregueEm.slice(0, 40) : null;
  if ("loja" in out && !LOJAS.includes(out.loja)) out.loja = "bordados";
  if ("status" in out && !ETAPAS.includes(out.status)) out.status = "a_fazer";
  return out;
}

function eventos(lista, nome, agora) {
  return (Array.isArray(lista) ? lista : []).slice(0, 5)
    .map(t => ({ em: agora, txt: String(t).slice(0, 200), por: nome || null }));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const usuario = sessao(req);
  if (!usuario) return res.status(401).json({ erro: "Sua sessão acabou. Entre de novo." });
  if (req.method !== "GET" && !pedidoJson(req)) return res.status(415).json({ erro: "Formato inválido." });

  const redis = conectar();
  if (!redis) return res.status(500).json({ erro: "Banco de dados não conectado. Adicione o Upstash Redis em Storage, no projeto da Vercel." });

  const id = typeof req.query.id === "string" ? req.query.id.slice(0, 64) : "";
  const corpo = req.body && typeof req.body === "object" ? req.body : {};
  const nome = usuario;
  const agora = new Date().toISOString();

  try {
    switch (req.method) {
      case "GET": {
        const tudo = (await redis.hgetall(CHAVE)) || {};
        return res.status(200).json(Object.entries(tudo).map(([k, v]) => ({ ...ler(v), id: k })));
      }

      case "POST": {
        const dados = limpar(corpo.dados);
        if (!dados.cliente || !dados.produto) return res.status(400).json({ erro: "Cliente e produto são obrigatórios." });
        const novoId = randomUUID();
        const pedido = { ...dados, criadoEm: agora, atualizadoEm: agora, historico: eventos(corpo.eventos, nome, agora) };
        await redis.hset(CHAVE, { [novoId]: JSON.stringify(pedido) });
        return res.status(201).json({ ...pedido, id: novoId });
      }

      case "PUT":
      case "PATCH": {
        if (!id) return res.status(400).json({ erro: "Faltou o id do pedido." });
        const bruto = await redis.hget(CHAVE, id);
        if (!bruto) return res.status(404).json({ erro: "Esse pedido não existe mais." });
        const antigo = ler(bruto);
        const historico = [...(Array.isArray(antigo.historico) ? antigo.historico : []), ...eventos(corpo.eventos, nome, agora)].slice(-60);
        const base = req.method === "PUT" ? { criadoEm: antigo.criadoEm } : antigo;
        const pedido = { ...base, ...limpar(corpo.dados), atualizadoEm: agora, historico };
        delete pedido.id;
        await redis.hset(CHAVE, { [id]: JSON.stringify(pedido) });
        return res.status(200).json({ ...pedido, id });
      }

      case "DELETE": {
        if (!id) return res.status(400).json({ erro: "Faltou o id do pedido." });
        await redis.hdel(CHAVE, id);
        return res.status(200).json({ ok: true });
      }

      default:
        res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
        return res.status(405).json({ erro: "Método não permitido." });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor. Tente de novo em alguns segundos." });
  }
}
