import { Check, ChevronRight, Clipboard, Home, Instagram, MessageCircle, Minus, Plus, ShieldCheck, Soup, Upload } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, dinheiro } from '../lib/api';

type Config = {
  vendasAbertas: boolean;
  chavePix: string;
  valorUnitarioSopa: number;
  mensagemFechado: string;
};
type Contato = { id: number; nome: string; numeroWhatsApp: string };
type DadosCliente = { nomeCliente: string; telefoneCliente: string; enderecoEntrega: string; pontoReferencia: string };
type Pix = { payload: string; chavePix: string; valor: number };
type Confirmacao = { id: number; valorTotal: number; statusPedido: string };

const dadosIniciais: DadosCliente = {
  nomeCliente: '',
  telefoneCliente: '',
  enderecoEntrega: '',
  pontoReferencia: '',
};

export function OrderPage() {
  const [config, setConfig] = useState<Config>();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [dados, setDados] = useState<DadosCliente>(() => {
    try {
      return { ...dadosIniciais, ...JSON.parse(localStorage.getItem('ibe.dadosCliente') || '{}') };
    } catch {
      return dadosIniciais;
    }
  });
  const [quantidade, setQuantidade] = useState(1);
  const [pagamento, setPagamento] = useState<'DINHEIRO' | 'PIX'>('DINHEIRO');
  const [arquivo, setArquivo] = useState<File>();
  const [pix, setPix] = useState<Pix>();
  const [confirmacao, setConfirmacao] = useState<Confirmacao>();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Config>('/configuracao/publica'),
      api<Contato[]>('/contatos-plantao/publicos'),
    ])
      .then(([configuracao, lista]) => {
        setConfig(configuracao);
        setContatos(lista);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(() => {
    localStorage.setItem('ibe.dadosCliente', JSON.stringify(dados));
  }, [dados]);

  const total = useMemo(() => (config?.valorUnitarioSopa || 0) * quantidade, [config, quantidade]);

  useEffect(() => {
    if (pagamento !== 'PIX' || !total) return;
    const timer = window.setTimeout(() => {
      api<Pix>('/pix/payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: total }),
      })
        .then(setPix)
        .catch((e: Error) => setErro(e.message));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [pagamento, total]);

  const alterarDados = (campo: keyof DadosCliente, valor: string) =>
    setDados((atual) => ({ ...atual, [campo]: valor }));

  const selecionarArquivo = (file?: File) => {
    setErro('');
    if (!file) return setArquivo(undefined);
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      return setErro('Envie um comprovante em JPEG, PNG ou PDF.');
    }
    if (file.size > 5 * 1024 * 1024) return setErro('O comprovante deve ter no máximo 5 MB.');
    setArquivo(file);
  };

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    const body = new FormData();
    Object.entries(dados).forEach(([chave, valor]) => valor && body.append(chave, valor));
    body.append('quantidadeSopas', String(quantidade));
    body.append('formaPagamento', pagamento);
    if (arquivo) body.append('comprovante', arquivo);
    try {
      const pedido = await api<Confirmacao>('/pedidos', { method: 'POST', body });
      setConfirmacao(pedido);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const copiarPix = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.payload);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const fazerOutroPedido = () => {
    setConfirmacao(undefined);
    setQuantidade(1);
    setPagamento('DINHEIRO');
    setArquivo(undefined);
    setPix(undefined);
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkContato = (contato: Contato) => {
    const numeroPedido = confirmacao ? ` do pedido #${confirmacao.id}` : '';
    const texto = `Olá, ${contato.nome}! Quero enviar o comprovante Pix${numeroPedido} da venda de sopas da IBE Gerais.`;
    return `https://wa.me/${contato.numeroWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
  };

  if (!config && !erro) {
    return <div className="grid min-h-screen place-items-center bg-ibe-black text-white"><Soup className="animate-pulse text-ibe-yellow" size={48} /></div>;
  }

  if (!config) return <EstadoMensagem titulo="Não foi possível carregar" texto={erro} />;

  if (!config.vendasAbertas) {
    return (
      <main className="grid min-h-screen place-items-center bg-ibe-black px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-10">
          <Logo />
          <div className="mx-auto my-7 grid h-20 w-20 place-items-center rounded-full bg-ibe-cream text-ibe-yellowHover">
            <Soup size={42} />
          </div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[.2em] text-zinc-500">Vendas encerradas</p>
          <h1 className="text-3xl font-black tracking-tight">A panela descansa por enquanto.</h1>
          <p className="mx-auto mt-4 max-w-md leading-7 text-zinc-600">No momento não estamos aceitando pedidos. Fique atento aos avisos no Instagram para saber quando as vendas abrirem novamente.</p>
          <a href="https://www.instagram.com/ibegerais/" target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
            <Instagram size={19} />
            Ir para o Instagram @ibegerais
          </a>
        </section>
      </main>
    );
  }

  if (confirmacao) {
    return (
      <main className="min-h-screen bg-ibe-cream px-4 py-8 sm:py-14">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-5 text-center shadow-soft sm:p-10">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={42} strokeWidth={3} /></div>
          <p className="mt-6 text-sm font-extrabold uppercase tracking-[.18em] text-zinc-500">Pedido recebido</p>
          <h1 className="mt-2 text-4xl font-black">#{confirmacao.id}</h1>
          <p className="mt-3 text-zinc-600">Obrigado, {dados.nomeCliente.split(' ')[0]}! Seu pedido de <strong>{quantidade} {quantidade === 1 ? 'sopa' : 'sopas'}</strong> foi registrado.</p>
          <div className="my-6 rounded-2xl bg-ibe-black p-5 text-left text-white">
            <div className="flex items-center justify-between"><span className="text-zinc-400">Total</span><strong className="text-2xl text-ibe-yellow">{dinheiro(confirmacao.valorTotal)}</strong></div>
            <div className="mt-2 flex items-center justify-between text-sm"><span className="text-zinc-400">Pagamento</span><span>{pagamento === 'PIX' ? 'Pix' : 'Dinheiro na entrega'}</span></div>
          </div>
          {pagamento === 'PIX' && !arquivo && (
            <div className="text-left">
              <p className="mb-3 text-sm font-bold text-zinc-700">Envie seu comprovante para um contato de plantão:</p>
              <Contatos contatos={contatos} linkContato={linkContato} />
            </div>
          )}
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500"><ShieldCheck size={17} /> Guarde o número para acompanhar com a equipe.</p>
          <button type="button" onClick={fazerOutroPedido} className="btn-primary mt-6 w-full"><Home size={19} /> Voltar à home e fazer outro pedido</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ibe-light pb-28 sm:pb-12">
      <header className="bg-ibe-black px-4 pb-20 pt-6 text-white sm:pb-28 sm:pt-9">
        <div className="mx-auto flex max-w-5xl items-center justify-between"><Logo invertido /><span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-extrabold text-emerald-300">● Vendas abertas</span></div>
        <div className="mx-auto mt-12 max-w-5xl">
          <p className="text-xs font-extrabold uppercase tracking-[.22em] text-ibe-yellow">Domingo de sopas</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">Uma sopa quentinha.<br />Um gesto que transforma.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">Faça seu pedido e participe da ação beneficente da Igreja Batista Esperança.</p>
        </div>
      </header>

      <form onSubmit={enviar} className="mx-auto -mt-12 grid max-w-5xl gap-5 px-3 sm:-mt-16 sm:px-4 lg:grid-cols-[1.4fr_.8fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className="card">
            <SecaoNumero numero="01" titulo="Onde entregamos?" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo label="Seu nome" required value={dados.nomeCliente} onChange={(v) => alterarDados('nomeCliente', v)} placeholder="Nome completo" />
              <Campo label="WhatsApp" required type="tel" value={dados.telefoneCliente} onChange={(v) => alterarDados('telefoneCliente', v)} placeholder="(31) 99999-9999" />
              <div className="sm:col-span-2"><Campo label="Endereço de entrega" required value={dados.enderecoEntrega} onChange={(v) => alterarDados('enderecoEntrega', v)} placeholder="Rua, número e bairro" /></div>
              <div className="sm:col-span-2"><Campo label="Ponto de referência (opcional)" value={dados.pontoReferencia} onChange={(v) => alterarDados('pontoReferencia', v)} placeholder="Ex.: portão ao lado da padaria" /></div>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Seus dados ficam salvos somente neste aparelho para facilitar o próximo pedido.</p>
          </section>

          <section className="card">
            <SecaoNumero numero="02" titulo="Quantas sopas?" />
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-ibe-cream p-3 sm:p-5">
              <div><p className="font-extrabold">Sopa beneficente</p><p className="mt-1 text-sm text-zinc-600">{dinheiro(config.valorUnitarioSopa)} por unidade</p></div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm"><Minus size={19} /></button>
                <output className="w-9 text-center text-xl font-black">{quantidade}</output>
                <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantidade((q) => Math.min(100, q + 1))} className="grid h-11 w-11 place-items-center rounded-xl bg-ibe-yellow shadow-sm"><Plus size={19} /></button>
              </div>
            </div>
          </section>

          <section className="card">
            <SecaoNumero numero="03" titulo="Como vai pagar?" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(['DINHEIRO', 'PIX'] as const).map((opcao) => (
                <button type="button" key={opcao} onClick={() => setPagamento(opcao)} className={`min-h-16 rounded-xl border-2 px-2 font-extrabold transition ${pagamento === opcao ? 'border-ibe-yellow bg-ibe-cream' : 'border-zinc-200 bg-white'}`}>
                  {opcao === 'PIX' ? 'Pix' : 'Dinheiro'}
                </button>
              ))}
            </div>

            {pagamento === 'PIX' && (
              <div className="mt-5 space-y-5 rounded-2xl border border-ibe-yellow/40 bg-ibe-cream p-4 sm:p-5">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div className="rounded-xl bg-white p-3 shadow-sm">{pix ? <QRCodeSVG value={pix.payload} size={168} level="M" /> : <div className="h-[168px] w-[168px] animate-pulse rounded bg-zinc-100" />}</div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-sm font-bold text-zinc-500">Pague exatamente</p>
                    <p className="text-3xl font-black">{dinheiro(total)}</p>
                    <p className="mt-3 text-xs text-zinc-500">Chave CNPJ</p>
                    <p className="font-bold">{config.chavePix}</p>
                    <button type="button" onClick={copiarPix} disabled={!pix} className="btn-dark mt-4 w-full sm:w-auto">{copiado ? <Check size={18} /> : <Clipboard size={18} />}{copiado ? 'Código copiado' : 'Copiar código Pix'}</button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="comprovante">Comprovante (opcional)</label>
                  <label htmlFor="comprovante" className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-400 bg-white p-3 text-sm font-bold text-zinc-700">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100"><Upload size={19} /></span>
                    <span className="min-w-0 truncate">{arquivo?.name || 'Anexar JPEG, PNG ou PDF (até 5 MB)'}</span>
                  </label>
                  <input id="comprovante" className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => selecionarArquivo(e.target.files?.[0])} />
                </div>
                <div>
                  <p className="mb-2 text-xs leading-5 text-zinc-600">Se preferir, finalize o pedido e envie o comprovante pelo WhatsApp:</p>
                  <Contatos contatos={contatos} linkContato={linkContato} />
                </div>
              </div>
            )}
          </section>
          {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</p>}
        </div>

        <aside className="card hidden lg:sticky lg:top-5 lg:block">
          <Resumo quantidade={quantidade} total={total} pagamento={pagamento} enviando={enviando} />
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.08)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1"><p className="text-xs font-bold text-zinc-500">Total do pedido</p><p className="text-xl font-black">{dinheiro(total)}</p></div>
            <button disabled={enviando} className="btn-primary min-w-[170px]">{enviando ? 'Enviando...' : 'Fazer pedido'}<ChevronRight size={19} /></button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Logo({ invertido = false }: { invertido?: boolean }) {
  return <div className={`inline-flex items-center gap-2 font-black tracking-tight ${invertido ? 'text-white' : 'text-ibe-black'}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-ibe-yellow text-ibe-black"><Soup size={23} /></span><span>IBE <span className="text-ibe-yellowHover">GERAIS</span></span></div>;
}

function SecaoNumero({ numero, titulo }: { numero: string; titulo: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-ibe-black text-xs font-black text-ibe-yellow">{numero}</span><h2 className="text-xl font-black tracking-tight">{titulo}</h2></div>;
}

function Campo({ label, value, onChange, ...props }: { label: string; value: string; onChange: (valor: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <label><span className="label">{label}</span><input className="field" value={value} onChange={(e) => onChange(e.target.value)} {...props} /></label>;
}

function Contatos({ contatos, linkContato }: { contatos: Contato[]; linkContato: (contato: Contato) => string }) {
  if (!contatos.length) return <p className="text-sm text-zinc-500">Nenhum contato disponível agora.</p>;
  return <div className="grid gap-2 sm:grid-cols-2">{contatos.map((contato) => <a key={contato.id} href={linkContato(contato)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"><MessageCircle size={18} />{contato.nome}</a>)}</div>;
}

function Resumo({ quantidade, total, pagamento, enviando }: { quantidade: number; total: number; pagamento: string; enviando: boolean }) {
  return <><p className="text-xs font-extrabold uppercase tracking-[.18em] text-zinc-500">Resumo</p><h2 className="mt-2 text-2xl font-black">Seu pedido</h2><div className="my-6 space-y-3 border-y py-5 text-sm"><div className="flex justify-between"><span className="text-zinc-500">Quantidade</span><strong>{quantidade} {quantidade === 1 ? 'sopa' : 'sopas'}</strong></div><div className="flex justify-between"><span className="text-zinc-500">Pagamento</span><strong>{pagamento === 'PIX' ? 'Pix' : 'Dinheiro'}</strong></div></div><div className="flex items-end justify-between"><span className="font-bold text-zinc-500">Total</span><strong className="text-3xl">{dinheiro(total)}</strong></div><button disabled={enviando} className="btn-primary mt-6 w-full">{enviando ? 'Enviando...' : 'Confirmar pedido'}<ChevronRight size={19} /></button></>;
}

function EstadoMensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return <main className="grid min-h-screen place-items-center bg-ibe-light p-4"><div className="card max-w-md text-center"><Soup className="mx-auto mb-4 text-ibe-yellowHover" size={44} /><h1 className="text-2xl font-black">{titulo}</h1><p className="mt-2 text-zinc-600">{texto}</p><button onClick={() => location.reload()} className="btn-primary mt-6">Tentar novamente</button></div></main>;
}
