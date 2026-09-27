import * as SwitchPrimitive from '@radix-ui/react-switch';
import {
  Banknote,
  BellRing,
  Check,
  ClipboardCheck,
  Eye,
  LogOut,
  PackageCheck,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Route,
  Save,
  Settings,
  ShoppingBag,
  Soup,
  Trash2,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '../components/ui/Dialog';
import { api, authHeaders, dinheiro } from '../lib/api';

type Config = { vendasAbertas: boolean; chavePix: string; valorUnitarioSopa: number; mensagemFechado: string };
type Contato = { id: number; nome: string; numeroWhatsApp: string; ativo: boolean };
type StatusPedido = 'PENDENTE' | 'CONFIRMADO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';
type Pedido = {
  id: number;
  nomeCliente: string;
  telefoneCliente: string;
  enderecoEntrega: string;
  pontoReferencia?: string;
  quantidadeSopas: number;
  formaPagamento: 'PIX' | 'DINHEIRO';
  valorTotal: number;
  comprovantePath?: string;
  statusPedido: StatusPedido;
  statusPagamento: 'PENDENTE' | 'CONFIRMADO';
  criadoEm: string;
};
type PaginatedPedidos = {
  pedidos: Pedido[];
  paginacao: { pagina: number; porPagina: number; total: number; totalPaginas: number };
};
type ResumoMetricas = {
  totalSopas: number;
  faturamentoTotal: number;
  faturamentoPix: number;
  faturamentoDinheiro: number;
  pedidosPendentes: number;
  pedidosEmRota: number;
  pedidosEntregues: number;
};
type Metricas = { hoje: ResumoMetricas; geral: ResumoMetricas };

const statusPedido: StatusPedido[] = ['PENDENTE', 'CONFIRMADO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'];
const nomeStatus: Record<StatusPedido, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  SAIU_PARA_ENTREGA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export function AdminPage() {
  const [autenticado, setAutenticado] = useState(Boolean(localStorage.getItem('ibe.admin.token')));
  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;
  return <Dashboard onLogout={() => { localStorage.removeItem('ibe.admin.token'); setAutenticado(false); }} />;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const enviar = async (event: FormEvent) => {
    event.preventDefault(); setErro(''); setCarregando(true);
    try {
      const resposta = await api<{ accessToken: string }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
      localStorage.setItem('ibe.admin.token', resposta.accessToken); onLogin();
    } catch (e) { setErro((e as Error).message); } finally { setCarregando(false); }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-ibe-black px-4 py-8">
      <form onSubmit={enviar} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-ibe-yellow"><Soup /></span><div><p className="font-black">IBE GERAIS</p><p className="text-xs font-bold text-zinc-500">Painel administrativo</p></div></div>
        <h1 className="text-2xl font-black">Boas-vindas</h1><p className="mt-1 text-sm text-zinc-500">Entre para gerenciar a venda de sopas.</p>
        <div className="mt-6 space-y-4"><label><span className="label">E-mail</span><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label><label><span className="label">Senha</span><input className="field" type="password" required minLength={4} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></label></div>
        {erro && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{erro}</p>}
        <button className="btn-primary mt-6 w-full" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar no painel'}</button>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<Config>();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [metricas, setMetricas] = useState<Metricas>();
  const [filtro, setFiltro] = useState<StatusPedido | ''>('');
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState<PaginatedPedidos['paginacao']>();
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>();
  const [avisoNovoPedido, setAvisoNovoPedido] = useState('');
  const [tempoRealConectado, setTempoRealConectado] = useState(false);
  const [comprovante, setComprovante] = useState<Pedido>();
  const [novoContato, setNovoContato] = useState({ nome: '', numeroWhatsApp: '' });
  const idsConhecidos = useRef<Set<number>>();
  const sincronizando = useRef(false);
  const audioContexto = useRef<AudioContext>();

  const tocarAvisoNovoPedido = useCallback(() => {
    // O aviso é sintetizado no navegador para não exigir um asset ou download externo.
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const contexto = audioContexto.current ?? new AudioContextClass();
    audioContexto.current = contexto;
    void contexto.resume().then(() => {
      const agora = contexto.currentTime;
      const ganho = contexto.createGain();
      ganho.gain.setValueAtTime(0.0001, agora);
      ganho.gain.exponentialRampToValueAtTime(0.16, agora + 0.015);
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.42);
      ganho.connect(contexto.destination);

      [659.25, 783.99].forEach((frequencia, indice) => {
        const oscilador = contexto.createOscillator();
        oscilador.type = 'sine';
        oscilador.frequency.value = frequencia;
        oscilador.connect(ganho);
        oscilador.start(agora + indice * 0.08);
        oscilador.stop(agora + 0.42);
      });
    }).catch(() => {
      // O navegador pode bloquear áudio até que exista uma interação do administrador.
    });
  }, []);

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}) => {
    try {
      return await api<T>(path, { ...options, headers: { ...authHeaders(options.body !== undefined), ...options.headers } });
    } catch (e) {
      if ((e as Error).message.toLowerCase().includes('unauthorized')) onLogout();
      throw e;
    }
  }, [onLogout]);

  const caminhoPedidos = useCallback(() => {
    const parametros = new URLSearchParams({ pagina: String(pagina) });
    if (filtro) parametros.set('status', filtro);
    return `/pedidos?${parametros.toString()}`;
  }, [filtro, pagina]);

  const carregar = useCallback(async () => {
    if (sincronizando.current) return;
    sincronizando.current = true;
    setCarregando(true); setErro('');
    try {
      const [cfg, listaContatos, listaPedidos, dadosMetricas] = await Promise.all([
        request<Config>('/configuracao'), request<Contato[]>('/contatos-plantao'), request<PaginatedPedidos>(caminhoPedidos()), request<Metricas>('/pedidos/metricas'),
      ]);
      idsConhecidos.current = new Set(listaPedidos.pedidos.map((pedido) => pedido.id));
      setConfig(cfg); setContatos(listaContatos); setPedidos(listaPedidos.pedidos); setPaginacao(listaPedidos.paginacao); setMetricas(dadosMetricas); setUltimaAtualizacao(new Date());
    } catch (e) { setErro((e as Error).message); } finally { sincronizando.current = false; setCarregando(false); }
  }, [caminhoPedidos, request]);

  const sincronizarPedidos = useCallback(async () => {
    if (sincronizando.current) return;
    sincronizando.current = true;
    try {
      const [listaPedidos, dadosMetricas] = await Promise.all([
        request<PaginatedPedidos>(caminhoPedidos()),
        request<Metricas>('/pedidos/metricas'),
      ]);
      const conhecidos = idsConhecidos.current;
      if (conhecidos) {
        const novos = listaPedidos.pedidos.filter((pedido) => !conhecidos.has(pedido.id));
        if (novos.length > 0) {
          tocarAvisoNovoPedido();
          if (novos.length === 1) setAvisoNovoPedido(`Novo pedido #${novos[0].id} recebido`);
          if (novos.length > 1) setAvisoNovoPedido(`${novos.length} novos pedidos recebidos`);
        }
      }
      idsConhecidos.current = new Set(listaPedidos.pedidos.map((pedido) => pedido.id));
      setPedidos(listaPedidos.pedidos);
      setPaginacao(listaPedidos.paginacao);
      setMetricas(dadosMetricas);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      setErro(`Falha na atualização automática: ${(e as Error).message}`);
    } finally {
      sincronizando.current = false;
    }
  }, [caminhoPedidos, request, tocarAvisoNovoPedido]);

  useEffect(() => {
    void carregar();
    let encerrado = false;
    let reconexao: number | undefined;
    let controlador: AbortController | undefined;

    const conectarTempoReal = async () => {
      controlador = new AbortController();
      try {
        const resposta = await fetch('/api/pedidos/eventos', {
          headers: authHeaders(false),
          signal: controlador.signal,
        });
        if (!resposta.ok || !resposta.body) throw new Error('Canal em tempo real indisponível');
        setTempoRealConectado(true);
        const leitor = resposta.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!encerrado) {
          const { value, done } = await leitor.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const eventos = buffer.split('\n\n');
          buffer = eventos.pop() || '';
          for (const evento of eventos) {
            const linha = evento.split('\n').find((item) => item.startsWith('data:'));
            if (!linha) continue;
            try {
              const dados = JSON.parse(linha.slice(5).trim()) as { tipo?: string };
              if (dados.tipo === 'NOVO_PEDIDO') void sincronizarPedidos();
            } catch {
              // Ignora apenas eventos incompletos; o próximo ciclo garante consistência.
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setTempoRealConectado(false);
      } finally {
        setTempoRealConectado(false);
        if (!encerrado) reconexao = window.setTimeout(() => void conectarTempoReal(), 3000);
      }
    };

    void conectarTempoReal();
    const intervalo = window.setInterval(() => void sincronizarPedidos(), 15_000);
    const aoVoltarParaAba = () => {
      if (document.visibilityState === 'visible') void sincronizarPedidos();
    };
    document.addEventListener('visibilitychange', aoVoltarParaAba);
    return () => {
      window.clearInterval(intervalo);
      if (reconexao) window.clearTimeout(reconexao);
      controlador?.abort();
      document.removeEventListener('visibilitychange', aoVoltarParaAba);
    };
  }, [carregar, sincronizarPedidos]);

  const atualizarConfig = async (dados: Partial<Config>) => {
    if (!config) return;
    const anterior = config; setConfig({ ...config, ...dados }); setErro('');
    try { setConfig(await request<Config>('/configuracao', { method: 'PATCH', body: JSON.stringify(dados) })); }
    catch (e) { setConfig(anterior); setErro((e as Error).message); }
  };

  const atualizarStatus = async (pedido: Pedido, status: StatusPedido) => {
    try { await request(`/pedidos/${pedido.id}/status`, { method: 'PATCH', body: JSON.stringify({ statusPedido: status }) }); await carregar(); }
    catch (e) { setErro((e as Error).message); }
  };

  const confirmarPagamento = async (pedido: Pedido) => {
    try { await request(`/pedidos/${pedido.id}/pagamento`, { method: 'PATCH', body: JSON.stringify({ statusPagamento: 'CONFIRMADO' }) }); setComprovante(undefined); await carregar(); }
    catch (e) { setErro((e as Error).message); }
  };

  const cancelarEstoque = async (pedido: Pedido) => {
    try {
      await request(`/pedidos/${pedido.id}/cancelar-estoque`, { method: 'PATCH' });
      await carregar();
    } catch (e) { setErro((e as Error).message); }
  };

  const criarContato = async (event: FormEvent) => {
    event.preventDefault();
    try { await request('/contatos-plantao', { method: 'POST', body: JSON.stringify(novoContato) }); setNovoContato({ nome: '', numeroWhatsApp: '' }); await carregar(); }
    catch (e) { setErro((e as Error).message); }
  };

  const atualizarContato = async (contato: Contato, dados: Partial<Contato>) => {
    try { await request(`/contatos-plantao/${contato.id}`, { method: 'PATCH', body: JSON.stringify(dados) }); await carregar(); }
    catch (e) { setErro((e as Error).message); }
  };

  const excluirContato = async (contato: Contato) => {
    if (!window.confirm(`Excluir o contato ${contato.nome}?`)) return;
    try { await request(`/contatos-plantao/${contato.id}`, { method: 'DELETE' }); await carregar(); }
    catch (e) { setErro((e as Error).message); }
  };

  const editarContato = async (contato: Contato) => {
    const nome = window.prompt('Nome do contato', contato.nome)?.trim();
    if (!nome) return;
    const numeroWhatsApp = window.prompt('WhatsApp com DDD', contato.numeroWhatsApp)?.trim();
    if (!numeroWhatsApp) return;
    await atualizarContato(contato, { nome, numeroWhatsApp });
  };

  return (
    <main className="min-h-screen bg-zinc-100 pb-12">
      <header className="bg-ibe-black px-4 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ibe-yellow text-ibe-black"><Soup size={22} /></span><div><p className="font-black">Sopas IBE</p><p className="hidden text-xs text-zinc-400 sm:block">Central de pedidos</p></div></div><button onClick={onLogout} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-zinc-300 hover:bg-white/10"><LogOut size={18} /><span className="hidden sm:inline">Sair</span></button></div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-zinc-500">Operação de hoje</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Gestão da campanha</h1><p className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${tempoRealConectado ? 'text-emerald-700' : 'text-amber-700'}`}><Radio size={14} className={tempoRealConectado ? 'animate-pulse' : ''} />{tempoRealConectado ? 'Ao vivo · pedidos chegam instantaneamente' : 'Reconectando · sincronização de segurança ativa'}{ultimaAtualizacao ? ` · ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}</p></div><button onClick={() => void carregar()} className="btn-soft !h-11 !w-11 !p-0" aria-label="Atualizar agora"><RefreshCw size={18} className={carregando ? 'animate-spin' : ''} /></button></div>
        {erro && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"><TriangleAlert className="shrink-0" size={18} />{erro}</div>}
        {avisoNovoPedido && <div role="status" className="flex flex-col gap-3 rounded-2xl border border-ibe-yellow bg-ibe-cream p-4 shadow-soft sm:flex-row sm:items-center"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ibe-yellow"><BellRing size={20} /></span><div className="min-w-0 flex-1"><p className="font-black">{avisoNovoPedido}</p><p className="text-sm text-zinc-600">A lista e os indicadores já foram atualizados automaticamente.</p></div><button onClick={() => { setFiltro('PENDENTE'); setPagina(1); setAvisoNovoPedido(''); }} className="btn-dark">Ver pendentes</button><button onClick={() => setAvisoNovoPedido('')} className="btn-soft">Dispensar</button></div>}

        {config && (
          <section className="grid gap-4 rounded-2xl bg-ibe-charcoal p-4 text-white shadow-soft sm:p-6 lg:grid-cols-[1fr_1fr]">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-4"><div><p className="font-black">Período de vendas</p><p className={`mt-1 text-sm font-bold ${config.vendasAbertas ? 'text-emerald-400' : 'text-zinc-400'}`}>{config.vendasAbertas ? 'Pedidos abertos ao público' : 'Pedidos encerrados'}</p></div><SwitchPrimitive.Root checked={config.vendasAbertas} onCheckedChange={(checked) => void atualizarConfig({ vendasAbertas: checked })} className="relative h-8 w-14 shrink-0 rounded-full bg-zinc-600 data-[state=checked]:bg-ibe-yellow"><SwitchPrimitive.Thumb className="block h-6 w-6 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-7" /></SwitchPrimitive.Root></div>
            <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-4 sm:flex-row sm:items-end"><label className="flex-1"><span className="mb-1.5 block text-xs font-bold text-zinc-400">Valor unitário da sopa</span><input type="number" min="0.01" step="0.01" className="field !border-zinc-600 !bg-ibe-black !text-white" value={config.valorUnitarioSopa} onChange={(e) => setConfig({ ...config, valorUnitarioSopa: Number(e.target.value) })} /></label><button onClick={() => void atualizarConfig({ valorUnitarioSopa: config.valorUnitarioSopa })} className="btn-primary"><Save size={18} />Salvar valor</button></div>
          </section>
        )}

        {metricas && <MetricasGrid metricas={metricas} />}

        <section className="card !p-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-xl font-black">Pedidos</h2><p className="mt-1 text-sm text-zinc-500">{paginacao?.total ?? 0} pedido(s) nesta visão</p></div><select className="field sm:w-52" value={filtro} onChange={(e) => { setFiltro(e.target.value as StatusPedido | ''); setPagina(1); }}><option value="">Todos os status</option>{statusPedido.map((status) => <option key={status} value={status}>{nomeStatus[status]}</option>)}</select></div>
          {carregando && !pedidos.length ? <div className="p-10 text-center text-zinc-500">Carregando pedidos...</div> : pedidos.length === 0 ? <div className="p-10 text-center"><ShoppingBag className="mx-auto text-zinc-300" size={40} /><p className="mt-3 font-bold text-zinc-500">Nenhum pedido encontrado</p></div> : <><PedidosLista pedidos={pedidos} atualizarStatus={atualizarStatus} abrirComprovante={setComprovante} cancelarEstoque={cancelarEstoque} confirmarPagamento={confirmarPagamento} />{paginacao && paginacao.totalPaginas > 1 && <nav className="flex items-center justify-between gap-3 border-t p-4 sm:px-6" aria-label="Paginação dos pedidos"><p className="text-sm font-bold text-zinc-500">Página {paginacao.pagina} de {paginacao.totalPaginas}</p><div className="flex gap-2"><button className="btn-soft" disabled={paginacao.pagina === 1 || carregando} onClick={() => setPagina((atual) => Math.max(1, atual - 1))}>Anterior</button><button className="btn-soft" disabled={paginacao.pagina === paginacao.totalPaginas || carregando} onClick={() => setPagina((atual) => atual + 1)}>Próxima</button></div></nav>}</>}
        </section>

        <section className="card">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ibe-cream"><Users size={20} /></span><div><h2 className="text-xl font-black">Contatos de plantão</h2><p className="text-sm text-zinc-500">Exibidos na etapa de pagamento Pix</p></div></div>
          <form onSubmit={criarContato} className="grid gap-3 rounded-xl bg-zinc-50 p-3 sm:grid-cols-[1fr_1fr_auto]"><input required minLength={2} className="field" placeholder="Nome" value={novoContato.nome} onChange={(e) => setNovoContato({ ...novoContato, nome: e.target.value })} /><input required minLength={10} className="field" placeholder="WhatsApp com DDD" value={novoContato.numeroWhatsApp} onChange={(e) => setNovoContato({ ...novoContato, numeroWhatsApp: e.target.value })} /><button className="btn-dark"><Plus size={18} />Adicionar</button></form>
          <div className="mt-4 divide-y">{contatos.map((contato) => <div key={contato.id} className="flex items-center gap-2 py-3"><div className="min-w-0 flex-1"><p className="truncate font-bold">{contato.nome}</p><p className="text-sm text-zinc-500">{contato.numeroWhatsApp}</p></div><button onClick={() => void atualizarContato(contato, { ativo: !contato.ativo })} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${contato.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{contato.ativo ? 'Ativo' : 'Inativo'}</button><button onClick={() => void editarContato(contato)} aria-label={`Editar ${contato.nome}`} className="grid h-10 w-10 place-items-center rounded-xl text-zinc-600 hover:bg-zinc-100"><Pencil size={18} /></button><button onClick={() => void excluirContato(contato)} aria-label={`Excluir ${contato.nome}`} className="grid h-10 w-10 place-items-center rounded-xl text-red-600 hover:bg-red-50"><Trash2 size={18} /></button></div>)}</div>
        </section>
      </div>

      <Dialog open={Boolean(comprovante)} onOpenChange={(open) => !open && setComprovante(undefined)} title={comprovante ? `Comprovante do pedido #${comprovante.id}` : 'Comprovante'}>
        {comprovante && <div><div className="grid min-h-64 place-items-center overflow-hidden rounded-xl bg-zinc-100">{comprovante.comprovantePath?.toLowerCase().endsWith('.pdf') ? <object data={comprovante.comprovantePath} type="application/pdf" className="h-[65vh] w-full"><p className="p-5 text-center text-sm text-zinc-600">Seu navegador não conseguiu exibir o PDF.</p></object> : <img src={comprovante.comprovantePath} alt={`Comprovante do pedido ${comprovante.id}`} className="max-h-[65vh] w-auto object-contain" />}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{comprovante.nomeCliente}</p><p className="text-sm text-zinc-500">{dinheiro(comprovante.valorTotal)} via Pix</p></div><button disabled={comprovante.statusPagamento === 'CONFIRMADO'} onClick={() => void confirmarPagamento(comprovante)} className="btn-primary"><ClipboardCheck size={19} />{comprovante.statusPagamento === 'CONFIRMADO' ? 'Pagamento confirmado' : 'Confirmar pagamento'}</button></div></div>}
      </Dialog>
    </main>
  );
}

function MetricasGrid({ metricas }: { metricas: Metricas }) {
  const cards = [
    { titulo: 'Sopas vendidas hoje', valor: String(metricas.hoje.totalSopas), detalhe: 'pedidos não cancelados de hoje', icon: Soup, destaque: true },
    { titulo: 'Faturamento de hoje', valor: dinheiro(metricas.hoje.faturamentoTotal), detalhe: `Pix ${dinheiro(metricas.hoje.faturamentoPix)} · Dinheiro ${dinheiro(metricas.hoje.faturamentoDinheiro)}`, icon: Banknote },
    { titulo: 'Pendentes hoje', valor: String(metricas.hoje.pedidosPendentes), detalhe: 'aguardando confirmação', icon: ClipboardCheck },
    { titulo: 'Em rota hoje', valor: String(metricas.hoje.pedidosEmRota), detalhe: `${metricas.hoje.pedidosEntregues} já entregues hoje`, icon: Route },
  ];
  return <section aria-label="Resumo das vendas"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ titulo, valor, detalhe, icon: Icon, destaque }) => <div key={titulo} className={`card !p-4 sm:!p-5 ${destaque ? '!border-ibe-yellow !bg-ibe-cream ring-1 ring-ibe-yellow' : ''}`}><div className="grid h-9 w-9 place-items-center rounded-lg bg-ibe-cream text-ibe-black"><Icon size={19} /></div><p className="mt-4 text-xs font-bold text-zinc-500">{titulo}</p><p className="mt-1 break-words text-xl font-black sm:text-2xl">{valor}</p><p className="mt-1 text-[11px] leading-4 text-zinc-400 sm:text-xs">{detalhe}</p></div>)}</div><details className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"><summary className="cursor-pointer font-bold text-zinc-600">Ver acumulado geral</summary><div className="mt-3 grid gap-3 border-t pt-3 text-zinc-600 sm:grid-cols-3"><p><span className="block text-xs font-bold uppercase tracking-wide text-zinc-400">Sopas vendidas</span><strong className="text-lg text-zinc-900">{metricas.geral.totalSopas}</strong></p><p><span className="block text-xs font-bold uppercase tracking-wide text-zinc-400">Faturamento</span><strong className="text-lg text-zinc-900">{dinheiro(metricas.geral.faturamentoTotal)}</strong></p><p><span className="block text-xs font-bold uppercase tracking-wide text-zinc-400">Entregues</span><strong className="text-lg text-zinc-900">{metricas.geral.pedidosEntregues}</strong></p></div></details></section>;
}

function PedidosLista({ pedidos, atualizarStatus, abrirComprovante, cancelarEstoque, confirmarPagamento }: { pedidos: Pedido[]; atualizarStatus: (p: Pedido, s: StatusPedido) => void; abrirComprovante: (p: Pedido) => void; cancelarEstoque: (p: Pedido) => void; confirmarPagamento: (p: Pedido) => void }) {
  return (
    <div>
      <div className="divide-y md:hidden">{pedidos.map((pedido) => <article key={pedido.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-zinc-400">PEDIDO #{pedido.id}</p><h3 className="mt-1 font-black">{pedido.nomeCliente}</h3><p className="mt-1 text-sm text-zinc-500">{pedido.quantidadeSopas} sopa(s) · {dinheiro(pedido.valorTotal)}</p></div><StatusBadge status={pedido.statusPedido} /></div><p className="mt-3 text-sm text-zinc-600">{pedido.enderecoEntrega}</p><div className="mt-4 grid gap-2"><select aria-label={`Status do pedido ${pedido.id}`} className="field" value={pedido.statusPedido} onChange={(e) => void atualizarStatus(pedido, e.target.value as StatusPedido)}>{statusPedido.map((status) => <option key={status} value={status}>{nomeStatus[status]}</option>)}</select><div className="grid grid-cols-2 gap-2">{pedido.comprovantePath ? <button onClick={() => abrirComprovante(pedido)} className="btn-soft"><Eye size={17} />Comprovante</button> : pedido.statusPagamento === 'PENDENTE' ? <button onClick={() => void confirmarPagamento(pedido)} className="btn-soft"><Check size={17} />Confirmar pgto.</button> : <span className="flex items-center justify-center rounded-xl bg-emerald-50 px-2 text-xs font-bold text-emerald-700">Pagamento ok</span>}<button disabled={pedido.statusPedido === 'CANCELADO'} onClick={() => void cancelarEstoque(pedido)} className="btn-soft !border-red-200 !text-red-700 disabled:opacity-40"><XCircle size={17} />Sem estoque</button></div></div></article>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-4">Pedido</th><th className="p-4">Cliente / entrega</th><th className="p-4">Itens</th><th className="p-4">Pagamento</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y">{pedidos.map((pedido) => <tr key={pedido.id} className="align-top hover:bg-zinc-50/60"><td className="p-4 font-black">#{pedido.id}<p className="mt-1 whitespace-nowrap text-xs font-normal text-zinc-400">{new Date(pedido.criadoEm).toLocaleString('pt-BR')}</p></td><td className="p-4"><p className="font-bold">{pedido.nomeCliente}</p><p className="mt-1 max-w-xs text-zinc-500">{pedido.enderecoEntrega}</p></td><td className="p-4"><strong>{pedido.quantidadeSopas}x</strong><p className="mt-1 text-xs text-zinc-500">{dinheiro(pedido.valorTotal)}</p></td><td className="p-4"><p className="font-bold">{pedido.formaPagamento === 'PIX' ? 'Pix' : 'Dinheiro'}</p><span className={`mt-1 inline-block text-xs font-extrabold ${pedido.statusPagamento === 'CONFIRMADO' ? 'text-emerald-700' : 'text-amber-700'}`}>{pedido.statusPagamento === 'CONFIRMADO' ? 'Confirmado' : 'Pendente'}</span></td><td className="p-4"><select className="rounded-lg border bg-white px-2 py-2 font-bold" value={pedido.statusPedido} onChange={(e) => void atualizarStatus(pedido, e.target.value as StatusPedido)}>{statusPedido.map((status) => <option key={status} value={status}>{nomeStatus[status]}</option>)}</select></td><td className="p-4"><div className="flex justify-end gap-2">{pedido.comprovantePath && <button title="Ver comprovante" onClick={() => abrirComprovante(pedido)} className="grid h-10 w-10 place-items-center rounded-lg bg-ibe-cream"><Eye size={18} /></button>}{pedido.statusPagamento === 'PENDENTE' && !pedido.comprovantePath && <button title="Confirmar pagamento" onClick={() => void confirmarPagamento(pedido)} className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Check size={18} /></button>}<button title="Cancelar por falta de estoque" disabled={pedido.statusPedido === 'CANCELADO'} onClick={() => void cancelarEstoque(pedido)} className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700 disabled:opacity-30"><XCircle size={18} /></button></div></td></tr>)}</tbody></table></div>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusPedido }) {
  const cores: Record<StatusPedido, string> = { PENDENTE: 'bg-amber-100 text-amber-800', CONFIRMADO: 'bg-blue-100 text-blue-800', SAIU_PARA_ENTREGA: 'bg-violet-100 text-violet-800', ENTREGUE: 'bg-emerald-100 text-emerald-800', CANCELADO: 'bg-red-100 text-red-800' };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${cores[status]}`}>{nomeStatus[status]}</span>;
}
