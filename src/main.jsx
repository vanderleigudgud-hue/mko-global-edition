import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Trophy, Gamepad2, Users, Play, Search, Swords, Newspaper, ShieldCheck, RefreshCw, X, ChevronRight, LogIn, LogOut, UserPlus, Save } from 'lucide-react';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const ready = url.startsWith('https://') && key.startsWith('sb_publishable_');
const db = ready ? createClient(url, key) : null;
const flag = {BR:'🇧🇷',US:'🇺🇸',AR:'🇦🇷',CL:'🇨🇱',MX:'🇲🇽',PT:'🇵🇹',JP:'🇯🇵'};
const rank = n => n<700?'E':n<1000?'D':n<1300?'C':n<1600?'B':n<1900?'A':'S';
const emptyPlayer = {nickname:'',display_name:'',country_code:'BR',country_name:'Brasil',continent:'América do Sul',bio:''};

function App(){
 const [games,setGames]=useState([]),[game,setGame]=useState(null),[players,setPlayers]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState(ready?'Conectando ao Supabase…':'Configure a conexão do Supabase no arquivo .env.'),[loading,setLoading]=useState(false),[profile,setProfile]=useState(null),[matches,setMatches]=useState([]),[adminOpen,setAdminOpen]=useState(false),[session,setSession]=useState(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[adminTab,setAdminTab]=useState('players'),[adminMessage,setAdminMessage]=useState(''),[saving,setSaving]=useState(false),[newPlayer,setNewPlayer]=useState(emptyPlayer),[selectedGames,setSelectedGames]=useState([]);
 async function load(selectedGameId=null){
  if(!db){setStatus('Supabase não configurado.');return}
  setLoading(true);
  try{
   const g=await db.from('mko_games').select('id,name,short_name').eq('is_active',true).order('sort_order');
   if(g.error)throw g.error;
   const gs=g.data||[];setGames(gs);
   const current=gs.find(x=>String(x.id)===String(selectedGameId??game?.id))||gs[0]||null;setGame(current);
   if(current){
    const r=await db.from('mko_player_stats').select('player_id,elo,wins,losses,draws,mko_players!inner(nickname,country_name,country_code,continent,is_active)').eq('game_id',current.id).order('elo',{ascending:false});
    if(r.error)throw r.error;
    const t=await db.from('mko_player_titles').select('player_id,game_id').eq('game_id',current.id);
    const tc={};(t.data||[]).forEach(x=>tc[x.player_id]=(tc[x.player_id]||0)+1);
    setPlayers((r.data||[]).filter(x=>x.mko_players?.is_active!==false).map(x=>{const p=x.mko_players||{},total=x.wins+x.losses+x.draws;return {player_id:x.player_id,nickname:p.nickname||'Jogador',country_name:p.country_name||'—',country_code:(p.country_code||'').trim(),continent:p.continent||'—',elo:x.elo,wins:x.wins,losses:x.losses,draws:x.draws,trophy_count:tc[x.player_id]||0,win_percentage:total?x.wins/total*100:0}}));
   } else setPlayers([]);
   const m=await db.from('mko_matches').select('id,played_at,player1_score,player2_score,format_label,video_url').eq('status','confirmed').order('played_at',{ascending:false}).limit(5);
   if(!m.error)setMatches(m.data||[]);
   setStatus('Conectado ao Supabase; catálogo e ranking carregados.');
  }catch(e){console.error(e);setStatus('Falha ao ler dados: '+(e.message||'verifique as políticas RLS.'))}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(!db)return;db.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 const filtered=useMemo(()=>players.filter(p=>(p.nickname+' '+(p.country_name||'')+' '+(p.continent||'')).toLowerCase().includes(query.toLowerCase())),[players,query]);
 async function login(e){e.preventDefault();setAdminMessage('');if(!db)return;setSaving(true);const {data,error}=await db.auth.signInWithPassword({email:email.trim(),password});setSaving(false);if(error){setAdminMessage('Não foi possível entrar: '+error.message);return}setSession(data.session);setAdminMessage('Login realizado.')}
 async function logout(){if(db)await db.auth.signOut();setSession(null);setAdminMessage('Sessão encerrada.')}
 async function createPlayer(e){
  e.preventDefault();setAdminMessage('');
  if(!db||!session){setAdminMessage('Entre com a conta de administrador primeiro.');return}
  const nickname=newPlayer.nickname.trim();
  if(!nickname){setAdminMessage('Informe o nickname.');return}
  setSaving(true);
  try{
   const exists=await db.from('mko_players').select('id,nickname').ilike('nickname',nickname).limit(1);
   if(exists.error)throw exists.error;
   if(exists.data?.length){setAdminMessage('Esse nickname já existe. Abra o cadastro existente em vez de duplicar.');return}
   const {data:p,error:pe}=await db.from('mko_players').insert({nickname,display_name:newPlayer.display_name.trim()||null,country_code:newPlayer.country_code,country_name:newPlayer.country_name.trim()||null,continent:newPlayer.continent,bio:newPlayer.bio.trim()||null,is_active:true}).select('id,nickname').single();
   if(pe)throw pe;
   if(selectedGames.length){
    const rows=selectedGames.map(gid=>({player_id:p.id,game_id:gid,elo:1000,wins:0,losses:0,draws:0,ranked_series_played:0}));
    const {error:se}=await db.from('mko_player_stats').insert(rows);
    if(se)throw se;
   }
   setAdminMessage(`Jogador ${p.nickname} cadastrado${selectedGames.length?' e associado aos jogos selecionados':''}.`);
   setNewPlayer(emptyPlayer);setSelectedGames([]);await load(game?.id);
  }catch(err){console.error(err);setAdminMessage('Erro ao cadastrar: '+(err.message||'verifique permissões e nickname duplicado.'))}
  finally{setSaving(false)}
 }
 function choose(g){load(g.id)}
 return <div className="app"><header><a className="brand" href="#top"><span className="logo">M</span><span><b>MKO</b><small>GLOBAL EDITION</small></span></a><nav><a href="#top">Início</a><a href="#ranking">Ranking</a><a href="#games">Jogos</a><a href="#matches">Partidas</a></nav><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar jogador..."/></label><button className="admin" onClick={()=>{setAdminOpen(true);setAdminMessage('')}}><ShieldCheck size={16}/> Painel</button></header>
 <main id="top"><section className="hero"><div className="art left">SCORPION</div><div className="hero-content"><small>COMUNIDADE DE JOGOS DE LUTA</small><h1>MKO</h1><h2>GLOBAL EDITION</h2><p>Ranking mundial · Jogadores · Partidas · Torneios</p><button onClick={()=>document.getElementById('ranking').scrollIntoView({behavior:'smooth'})}>VER RANKING <ChevronRight size={16}/></button></div><div className="art right">SUB-ZERO</div></section>
 <section className="features"><div><Trophy/><span><b>Ranking global</b><small>Por jogo e região</small></span></div><div><Swords/><span><b>Histórico completo</b><small>Resultados e evolução Elo</small></span></div><div><Play/><span><b>Vídeos das partidas</b><small>Miniaturas clicáveis</small></span></div></section>
 <section id="games" className="section"><div className="section-title"><div><small>CATÁLOGO</small><h2>Escolha o jogo</h2></div><span>Rankings independentes por jogo</span></div><div className="games">{games.map(g=><button key={g.id} className={game?.id===g.id?'chosen':''} onClick={()=>choose(g)}><Gamepad2/><span><b>{g.name}</b><small>{g.short_name||'Mortal Kombat'}</small></span></button>)}</div></section>
 <div className="columns"><section id="ranking" className="panel"><div className="panel-title"><div><small>CLASSIFICAÇÃO</small><h2><Trophy/> Ranking global</h2><p>{game?.name||'Selecione um jogo'}</p></div><button className="refresh" onClick={()=>load(game?.id)} title="Atualizar"><RefreshCw size={16}/></button></div><div className="table-scroll"><table><thead><tr><th>#</th><th>Player</th><th>Country</th><th>Continent</th><th>Flag</th><th>ELO</th><th>Rank</th><th>W</th><th>L</th><th>D</th><th>%Win</th><th>Progress</th><th>🏆</th><th>Details</th></tr></thead><tbody>{filtered.map((p,i)=>{let total=p.wins+p.losses+p.draws;return <tr key={p.player_id}><td>{i+1}</td><td><button className="player" onClick={()=>setProfile(p)}>{p.nickname}</button></td><td>{p.country_name||'—'}</td><td>{p.continent||'—'}</td><td className="flag">{flag[p.country_code]||'🌐'}</td><td className="elo">{p.elo}</td><td><b className={'rank r'+rank(p.elo)}>{rank(p.elo)}</b></td><td>{p.wins}</td><td>{p.losses}</td><td>{p.draws}</td><td>{(p.win_percentage??(total?p.wins/total*100:0)).toFixed(1)}%</td><td className="positive">—</td><td className="gold">{p.trophy_count||0}</td><td><button className="detail" onClick={()=>setProfile(p)}>Ver perfil</button></td></tr>})}{!filtered.length&&<tr><td colSpan="14" className="empty">{loading?'Carregando…':'Nenhum jogador cadastrado neste jogo ainda.'}</td></tr>}</tbody></table></div><div className="table-foot">{filtered.length} jogadores listados · Os dados vêm do Supabase.</div></section>
 <aside><section id="matches" className="panel"><div className="panel-title"><div><small>REPLAYS</small><h2><Play/> Partidas recentes</h2></div></div>{matches.length?matches.map(m=><div className="match" key={m.id}><div className="thumb" onClick={()=>m.video_url&&window.open(m.video_url,'_blank','noopener,noreferrer')}><Play fill="currentColor"/></div><div><b>Partida registrada</b><small>{new Date(m.played_at).toLocaleDateString('pt-BR')} · {m.format_label}</small><strong>{m.player1_score} × {m.player2_score}</strong></div></div>):<div className="no-matches"><div><Play fill="currentColor"/></div><b>Nenhuma partida publicada ainda</b><p>Partidas confirmadas aparecerão aqui.</p></div>}</section><section className="panel"><div className="panel-title"><div><small>COMUNIDADE</small><h2><Newspaper/> Novidades</h2></div></div><div className="news"><span>🏆</span><div><b>Ranking competitivo</b><small>Resultados e evolução dos jogadores.</small></div></div><div className="news"><span>🎮</span><div><b>Jogos clássicos</b><small>Uma comunidade para várias versões.</small></div></div></section></aside></div>
 <section className="stats"><div><Users/><b>{players.length}</b><small>JOGADORES NO RANKING ATUAL</small></div><div><Gamepad2/><b>{games.length}</b><small>JOGOS NO CATÁLOGO</small></div><div><Swords/><b>{matches.length}</b><small>PARTIDAS PUBLICADAS</small></div><div><Trophy/><b>—</b><small>TÍTULOS REGISTRADOS</small></div></section><div className="status"><i className={ready?'online':''}/>{status}{loading?' Atualizando…':''}</div><footer>© MKO Global Edition <span>Projeto em desenvolvimento</span></footer></main>
 {profile&&<div className="backdrop" onClick={()=>setProfile(null)}><section className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setProfile(null)}><X/></button><small>PERFIL DO JOGADOR</small><h2>{flag[profile.country_code]||'🌐'} {profile.nickname}</h2><p>{profile.country_name||'País não informado'} · {profile.continent||'Continente não informado'}</p><div className="profile-stats">{[['ELO',profile.elo],['Rank',rank(profile.elo)],['Vitórias',profile.wins],['Derrotas',profile.losses],['Empates',profile.draws],['Troféus',profile.trophy_count||0]].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div></section></div>}
 {adminOpen&&<div className="backdrop" onClick={()=>setAdminOpen(false)}><section className="modal admin-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setAdminOpen(false)}><X/></button><small>ÁREA RESTRITA</small><h2><ShieldCheck/> Painel administrativo</h2>
 {!session?<form className="admin-form" onSubmit={login}><p>Entre com o e-mail e a senha da conta de administrador criada no Supabase Auth.</p><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu e-mail de administrador"/></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha da conta"/></label><button className="admin-submit" disabled={saving}><LogIn size={16}/>{saving?'Entrando…':'Entrar'}</button></form>:<><div className="admin-session"><span>Conectado: {session.user.email}</span><button onClick={logout}><LogOut size={15}/> Sair</button></div><div className="admin-tabs"><button className={adminTab==='players'?'active':''} onClick={()=>setAdminTab('players')}><UserPlus size={15}/> Jogadores</button><button className={adminTab==='games'?'active':''} onClick={()=>setAdminTab('games')}><Gamepad2 size={15}/> Jogos</button></div>{adminTab==='players'?<form className="admin-form" onSubmit={createPlayer}><p>Cadastre o jogador uma única vez. Marque os jogos em que ele já pode aparecer no ranking.</p><label>Nickname único *<input required maxLength="40" value={newPlayer.nickname} onChange={e=>setNewPlayer({...newPlayer,nickname:e.target.value})} placeholder="Ex.: Carlos MK"/></label><label>Nome de exibição (opcional)<input value={newPlayer.display_name} onChange={e=>setNewPlayer({...newPlayer,display_name:e.target.value})}/></label><div className="form-grid"><label>País<select value={newPlayer.country_code} onChange={e=>{const v=e.target.value;const c={BR:['Brasil','América do Sul'],US:['Estados Unidos','América do Norte'],AR:['Argentina','América do Sul'],CL:['Chile','América do Sul'],MX:['México','América do Norte'],PT:['Portugal','Europa'],JP:['Japão','Ásia']};setNewPlayer({...newPlayer,country_code:v,country_name:c[v][0],continent:c[v][1]})}}>{Object.entries({BR:'Brasil',US:'Estados Unidos',AR:'Argentina',CL:'Chile',MX:'México',PT:'Portugal',JP:'Japão'}).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><label>Continente<select value={newPlayer.continent} onChange={e=>setNewPlayer({...newPlayer,continent:e.target.value})}>{['América do Sul','América do Norte','Europa','Ásia','África','Oceania'].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Biografia (opcional)<textarea rows="2" value={newPlayer.bio} onChange={e=>setNewPlayer({...newPlayer,bio:e.target.value})}/></label><fieldset><legend>Adicionar aos rankings</legend><div className="game-checks">{games.map(g=><label key={g.id}><input type="checkbox" checked={selectedGames.includes(String(g.id))} onChange={e=>setSelectedGames(old=>e.target.checked?[...old,String(g.id)]:old.filter(id=>id!==String(g.id)))}/>{g.name}</label>)}</div></fieldset><button className="admin-submit" disabled={saving}><Save size={16}/>{saving?'Salvando…':'Cadastrar jogador'}</button></form>:<div className="admin-form"><p>O catálogo já está sendo carregado do Supabase. A inclusão e edição de jogos pelo painel será a próxima etapa.</p><button className="admin-submit" onClick={()=>load(game?.id)}><RefreshCw size={16}/> Atualizar catálogo</button></div>}</>}
 {adminMessage&&<p className={adminMessage.startsWith('Erro')||adminMessage.startsWith('Não foi')?'admin-message error':'admin-message'}>{adminMessage}</p>}</section></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
