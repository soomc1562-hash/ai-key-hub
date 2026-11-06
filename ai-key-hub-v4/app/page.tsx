 "use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, Check, ChevronDown, Folder, KeyRound, LockKeyhole, LogOut, Mail, MessageSquare, Plus, Send, Settings, ShieldCheck, Sparkles, Trash2, UserRound, Users, Zap } from "lucide-react";

const providers = [
  { id: "openai", name: "ChatGPT", model: "gpt-4o-mini", color: "#21c58e", tint: "rgba(33,197,142,.16)", mark: "✳", hint: "OpenAI API key" },
  { id: "anthropic", name: "Claude", model: "claude-3-5-haiku-latest", color: "#e69a55", tint: "rgba(230,154,85,.16)", mark: "✺", hint: "Anthropic API key" },
  { id: "gemini", name: "Gemini", model: "gemini-2.0-flash", color: "#7b8cff", tint: "rgba(123,140,255,.18)", mark: "✦", hint: "Google AI Studio key" },
  { id: "deepseek", name: "DeepSeek", model: "deepseek-chat", color: "#48a9e8", tint: "rgba(72,169,232,.16)", mark: "◈", hint: "DeepSeek API key" },
  { id: "grok", name: "Grok", model: "grok-2-latest", color: "#d5d9e2", tint: "rgba(213,217,226,.12)", mark: "𝕏", hint: "xAI API key" },
  { id: "mistral", name: "Mistral", model: "mistral-small-latest", color: "#ad8aff", tint: "rgba(173,138,255,.16)", mark: "✣", hint: "Mistral API key" },
  { id: "qwen", name: "Qwen", model: "qwen-plus", color: "#f07878", tint: "rgba(240,120,120,.16)", mark: "❖", hint: "DashScope API key" }
] as const;
type ProviderId = typeof providers[number]["id"];
type Msg = { role: "user" | "assistant"; content: string };
type Account = { id: string; email: string; role?: string };
type Chat = { id:string; provider:string; title:string; folder:string; messages:Msg[]; updatedAt?:string };
type View = "playground" | "dashboard" | "connections" | "profile" | "admin";

export default function Home() {
  const [selected,setSelected]=useState<ProviderId>("openai");
  const [key,setKey]=useState("");
  const [connected,setConnected]=useState<ProviderId[]>([]);
  const [messages,setMessages]=useState<Msg[]>([]);
  const [prompt,setPrompt]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [showKey,setShowKey]=useState(false);
  const [account,setAccount]=useState<Account|null>(null);
  const [authMode,setAuthMode]=useState<"login"|"register">("register");
  const [authEmail,setAuthEmail]=useState("");
  const [authPassword,setAuthPassword]=useState("");
  const [authBusy,setAuthBusy]=useState(true);
  const [authError,setAuthError]=useState("");
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [savedChats,setSavedChats]=useState<Chat[]>([]);
  const [view,setView]=useState<View>("dashboard");
  const [folder,setFolder]=useState("All chats");
  const [newFolder,setNewFolder]=useState("");
  const [usage,setUsage]=useState({total:0,today:0,byProvider:[] as {provider:string;count:number}[]});
  const [adminData,setAdminData]=useState<any>(null);
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [profileNotice,setProfileNotice]=useState("");

  const provider=useMemo(()=>providers.find(p=>p.id===selected)!,[selected]);
  const folders=useMemo(()=>["All chats",...Array.from(new Set(savedChats.map(c=>c.folder||"General")))], [savedChats]);
  const filteredChats=folder==="All chats"?savedChats:savedChats.filter(c=>(c.folder||"General")===folder);

  useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(d=>setAccount(d.user)).catch(()=>{}).finally(()=>setAuthBusy(false));},[]);
  useEffect(()=>{
    if(!account)return;
    Promise.all([
      fetch("/api/conversations").then(r=>r.json()),
      fetch("/api/usage").then(r=>r.json())
    ]).then(([c,u])=>{setSavedChats(c.conversations||[]);if(typeof u.total==="number")setUsage(u);}).catch(()=>{});
  },[account]);
  useEffect(()=>{if(view==="admin"&&account?.role==="admin")fetch("/api/admin").then(r=>r.json()).then(setAdminData).catch(()=>{});},[view,account]);

  async function submitAuth(){
    setAuthBusy(true);setAuthError("");
    try{
      const res=await fetch(`/api/auth/${authMode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:authEmail,password:authPassword})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Не удалось выполнить запрос.");
      setAccount(data.user);setAuthPassword("");setView("dashboard");
    }catch(e){setAuthError(e instanceof Error?e.message:"Ошибка авторизации.");}finally{setAuthBusy(false);}
  }
  async function signOut(){await fetch("/api/auth/logout",{method:"POST"});setAccount(null);setKey("");setMessages([]);setSavedChats([]);setConversationId(null);setConnected([]);}
  async function refreshChats(){const d=await fetch("/api/conversations").then(r=>r.json());setSavedChats(d.conversations||[]);}
  async function persistConversation(next:Msg[]){
    if(!account||!next.length)return;
    try{
      const res=await fetch("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:conversationId,provider:selected,title:next.find(m=>m.role==="user")?.content||"Новый чат",folder:folder==="All chats"?"General":folder,messages:next})});
      const d=await res.json();if(res.ok&&d.id)setConversationId(d.id);await refreshChats();
    }catch{}
  }
  function openChat(chat:Chat){if(providers.some(p=>p.id===chat.provider))setSelected(chat.provider as ProviderId);setConversationId(chat.id);setMessages(chat.messages);setView("playground");setNotice("Диалог загружен.");}
  function choose(id:ProviderId){setSelected(id);setMessages([]);setConversationId(null);setNotice("");}
  function newChat(){setMessages([]);setConversationId(null);setNotice("Новый чат создан.");setView("playground");}
  async function deleteChat(id:string){await fetch(`/api/conversations?id=${encodeURIComponent(id)}`,{method:"DELETE"});setSavedChats(p=>p.filter(c=>c.id!==id));if(conversationId===id){setMessages([]);setConversationId(null);}}
  async function moveChat(id:string,to:string){await fetch("/api/conversations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,folder:to})});await refreshChats();}
  async function activate(){
    if(!key.trim()){setNotice("Сначала вставь API-ключ.");return;}
    setNotice("Проверяем подключение…");setBusy(true);
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:selected,apiKey:key,messages:[{role:"user",content:"Reply with exactly: connected"}],checkOnly:true})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Не удалось проверить ключ.");
      setConnected(p=>p.includes(selected)?p:[...p,selected]);setNotice("Подключение успешно. Ключ хранится только в памяти этой вкладки.");
    }catch(e){setNotice(e instanceof Error?e.message:"Ошибка подключения.");}finally{setBusy(false);}
  }
  async function sendMessage(){
    const text=prompt.trim();if(!text||!key.trim()){setNotice("Вставь API-ключ и напиши сообщение.");return;}
    const next=[...messages,{role:"user" as const,content:text}];setMessages(next);setPrompt("");setBusy(true);setNotice("");
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:selected,apiKey:key,messages:next})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Ошибка запроса.");
      const completed=[...next,{role:"assistant" as const,content:data.reply}];setMessages(completed);await persistConversation(completed);
      const u=await fetch("/api/usage").then(r=>r.json());if(typeof u.total==="number")setUsage(u);
    }catch(e){setMessages([...next,{role:"assistant",content:`Ошибка: ${e instanceof Error?e.message:"не удалось выполнить запрос"}`}]);}
    finally{setBusy(false);}
  }
  async function changePassword(){
    setProfileNotice("");
    const res=await fetch("/api/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
    const data=await res.json();setProfileNotice(res.ok?"Пароль успешно изменён.":data.error||"Не удалось изменить пароль.");
    if(res.ok){setCurrentPassword("");setNewPassword("");}
  }
  function createFolder(){
    const name=newFolder.trim().slice(0,40);if(!name)return;
    setFolder(name);setNewFolder("");
    setNotice(`Папка «${name}» появится в списке после сохранения диалога в неё.`);
  }

  if(authBusy&&!account)return <main className="authScreen"><div className="authCard"><div className="brand authBrand"><div className="brandIcon"><Sparkles size={19}/></div><span>AI <b>KEY HUB</b></span></div><p className="authMuted">Загружаем рабочее пространство…</p></div></main>;
  if(!account)return <main className="authScreen"><div className="authGlow"/><section className="authCard">
    <div className="brand authBrand"><div className="brandIcon"><Sparkles size={19}/></div><span>AI <b>KEY HUB</b></span></div>
    <div className="eyebrow"><Zap size={13}/> YOUR PERSONAL AI WORKSPACE</div><h1>{authMode==="register"?"Создай свой AI-хаб.":"С возвращением."}</h1>
    <p className="authMuted">{authMode==="register"?"Один аккаунт для твоих любимых AI-моделей.":"Войди, чтобы открыть свои диалоги и модели."}</p>
    <label className="fieldLabel">EMAIL</label><div className="authInput"><Mail size={15}/><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com"/></div>
    <label className="fieldLabel">PASSWORD</label><div className="authInput"><LockKeyhole size={15}/><input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitAuth()} placeholder="Минимум 10 символов"/></div>
    {authError&&<div className="authError">{authError}</div>}<button className="activate authSubmit" onClick={submitAuth} disabled={authBusy}>{authBusy?"Подождите…":authMode==="register"?"Создать аккаунт":"Войти"}<ArrowUpRight size={17}/></button>
    <div className="authSwitch">{authMode==="register"?"Уже есть аккаунт?":"Впервые здесь?"} <button onClick={()=>{setAuthMode(authMode==="register"?"login":"register");setAuthError("");}}>{authMode==="register"?"Войти":"Создать аккаунт"}</button></div>
    <div className="authPrivacy"><ShieldCheck size={14}/> Пароли хранятся в виде криптографических хешей.</div>
  </section></main>;

  return <main className="shell" style={{"--accent":provider.color,"--tint":provider.tint} as React.CSSProperties}>
    <aside className="sidebar">
      <div className="brand"><div className="brandIcon"><Sparkles size={19}/></div><span>AI <b>KEY HUB</b></span></div>
      <div className="sideLabel">WORKSPACE</div>
      <button className={`nav ${view==="dashboard"?"active":""}`} onClick={()=>setView("dashboard")}><BarChart3 size={17}/> Dashboard</button>
      <button className={`nav ${view==="playground"?"active":""}`} onClick={()=>setView("playground")}><MessageSquare size={17}/> AI Playground</button>
      <button className={`nav ${view==="connections"?"active":""}`} onClick={()=>setView("connections")}><KeyRound size={17}/> API Manager <span className="count">{connected.length}</span></button>
      <button className={`nav ${view==="profile"?"active":""}`} onClick={()=>setView("profile")}><Settings size={17}/> Профиль</button>
      {account.role==="admin"&&<button className={`nav ${view==="admin"?"active":""}`} onClick={()=>setView("admin")}><Users size={17}/> Админ-панель</button>}
      <div className="sideLabel chatListLabel">FOLDERS <button className="tinyPlus" onClick={()=>{const n=window.prompt("Название новой папки");if(n){setNewFolder(n);setFolder(n.trim().slice(0,40));}}}><Plus size={12}/></button></div>
      {folders.map(f=><button key={f} className={`folderNav ${folder===f?"folderActive":""}`} onClick={()=>setFolder(f)}><Folder size={13}/><span>{f}</span></button>)}
      <div className="sideLabel chatListLabel">RECENT CHATS</div>
      <div className="savedChatList">{filteredChats.slice(0,12).map(chat=><button key={chat.id} className="savedChat" onClick={()=>openChat(chat)}><MessageSquare size={13}/><span>{chat.title}</span></button>)}</div>
      <div className="sideBottom"><div className="accountMini"><div className="accountAvatar"><UserRound size={14}/></div><span>{account.email}</span><button title="Выйти" onClick={signOut}><LogOut size={14}/></button></div><div className="secure"><ShieldCheck size={17}/><div><b>Private by design</b><small>Ключи не сохраняются</small></div></div><div className="version">AI KEY HUB · V4</div></div>
    </aside>
    <section className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{({dashboard:"Dashboard",playground:"AI Playground",connections:"API Manager",profile:"Profile",admin:"Admin Panel"})[view]}</b></div><div className="topRight"><span className="live"><i/> SYSTEM ONLINE</span><div className="avatar">{account.email.slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {view==="dashboard"&&<><div className="hero"><div><div className="eyebrow"><Zap size={13}/> MULTI-MODEL WORKSPACE</div><h1>Твой AI-хаб.<br/><em>Твои правила.</em></h1><p>Все модели, диалоги и подключения в одном пространстве.</p></div><div className="heroOrb"><div className="orbCore">{provider.mark}</div><div className="orbRing ring1"/><div className="orbRing ring2"/></div></div>
          <div className="statsGrid"><div className="statCard"><span>ВСЕГО ЗАПРОСОВ</span><b>{usage.total}</b><small><Activity size={13}/> За всё время</small></div><div className="statCard"><span>СЕГОДНЯ</span><b>{usage.today}</b><small><Zap size={13}/> Запросы за день</small></div><div className="statCard"><span>ПОДКЛЮЧЕНО МОДЕЛЕЙ</span><b>{connected.length} / 7</b><small><Check size={13}/> В этой вкладке</small></div><div className="statCard"><span>СОХРАНЕНО ЧАТОВ</span><b>{savedChats.length}</b><small><MessageSquare size={13}/> В аккаунте</small></div></div>
          <div className="sectionHead"><div><h2>Быстрый запуск</h2><p>Выбери модель и переходи к общению</p></div><button className="textAction" onClick={()=>setView("connections")}>Управление API <ArrowUpRight size={14}/></button></div>
          <div className="providerGrid">{providers.map(p=><button key={p.id} onClick={()=>{choose(p.id);setView("playground");}} className={`provider ${selected===p.id?"chosen":""}`} style={{"--p":p.color,"--pt":p.tint} as React.CSSProperties}><span className="providerMark">{p.mark}</span><span className="providerInfo"><b>{p.name}</b><small>{p.model}</small></span>{connected.includes(p.id)&&<span className="check"><Check size={12}/></span>}</button>)}</div>
          <div className="sectionHead"><div><h2>Последние диалоги</h2><p>Продолжи недавнюю переписку</p></div><button className="textAction" onClick={()=>setView("playground")}>Новый чат <Plus size={14}/></button></div>
          <div className="recentGrid">{savedChats.slice(0,4).map(c=><button className="recentCard" key={c.id} onClick={()=>openChat(c)}><span>{providers.find(p=>p.id===c.provider)?.mark||"✦"}</span><b>{c.title}</b><small>{c.folder||"General"} · {c.provider}</small></button>)}{savedChats.length===0&&<div className="emptyHint">Пока нет диалогов. Открой AI Playground и отправь первое сообщение.</div>}</div>
        </>}
        {view==="playground"&&<><div className="pageHeading"><div><div className="eyebrow"><Zap size={13}/> AI PLAYGROUND</div><h1>Поговорим с <em>{provider.name}.</em></h1><p>Выбери модель, подключи ключ и начни диалог.</p></div><button className="outlineAction" onClick={newChat}><Plus size={14}/> Новый чат</button></div>
          <div className="providerGrid">{providers.map(p=><button key={p.id} onClick={()=>choose(p.id)} className={`provider ${selected===p.id?"chosen":""}`} style={{"--p":p.color,"--pt":p.tint} as React.CSSProperties}><span className="providerMark">{p.mark}</span><span className="providerInfo"><b>{p.name}</b><small>{p.model}</small></span>{connected.includes(p.id)&&<span className="check"><Check size={12}/></span>}</button>)}</div>
          <div className="workspaceGrid">
            <section className="panel connectPanel"><div className="panelTitle"><div className="titleIcon"><KeyRound size={17}/></div><div><h3>Подключение API</h3><p>Ключ используется для выбранного провайдера</p></div><span className="step">01</span></div>
              <div className="selectedProvider"><span className="bigMark">{provider.mark}</span><div><small>SELECTED PROVIDER</small><b>{provider.name}</b></div><span className="themeBadge">LIVE THEME</span></div>
              <label className="fieldLabel">API KEY</label><div className="keyField"><input type={showKey?"text":"password"} value={key} onChange={e=>setKey(e.target.value)} placeholder={`Вставь ${provider.hint}…`} autoComplete="off"/><button onClick={()=>setShowKey(!showKey)}>{showKey?"Скрыть":"Показать"}</button></div>
              <div className="privacy"><LockKeyhole size={13}/> Ключ не сохраняется в аккаунте, базе данных или localStorage.</div>
              <button className="activate" onClick={activate} disabled={busy}><span>{busy?"Проверяем…":"Активировать ключ"}</span><ArrowUpRight size={17}/></button>
              {notice&&<div className="notice">{notice}</div>}<div className="securityLine"><ShieldCheck size={15}/> Ключ остаётся в памяти текущей вкладки</div>
            </section>
            <section className="panel chatPanel"><div className="panelTitle"><div className="titleIcon"><MessageSquare size={17}/></div><div><h3>AI Playground</h3><p>Общение с {provider.name}</p></div><span className="chatStatus"><i/> READY</span></div>
              <div className="chatBody">{messages.length===0?<div className="empty"><div className="emptyIcon">{provider.mark}</div><b>Привет! Я {provider.name}.</b><p>Подключи API-ключ и отправь первое сообщение.</p><span className="suggestion" onClick={()=>setPrompt("Расскажи, что ты умеешь?")}>Расскажи, что ты умеешь <ArrowUpRight size={12}/></span></div>:messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}><small>{m.role==="user"?"YOU":provider.name.toUpperCase()}</small><p>{m.content}</p></div>)}</div>
              <div className="composer"><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()} placeholder={`Напиши ${provider.name}…`}/><button onClick={sendMessage} disabled={busy}><Send size={16}/></button></div><div className="chatFoot"><span><i/> {connected.includes(selected)?"API CONNECTED":"AWAITING CONNECTION"}</span><span>MODEL · {provider.model}</span><button className="clearHistory" onClick={()=>conversationId&&deleteChat(conversationId)}>Удалить диалог</button></div>
            </section>
          </div>
        </>}
        {view==="connections"&&<><div className="pageHeading"><div><div className="eyebrow"><KeyRound size={13}/> CONNECTION CENTER</div><h1>API <em>Manager.</em></h1><p>Подключения действуют только в текущей вкладке. Секретные ключи не сохраняются.</p></div></div><div className="connectionList">{providers.map(p=><div className="connectionRow" key={p.id} style={{"--p":p.color,"--pt":p.tint} as React.CSSProperties}><div className="providerMark">{p.mark}</div><div className="connectionName"><b>{p.name}</b><small>{p.model}</small></div><span className={`connectionState ${connected.includes(p.id)?"isConnected":""}`}><i/>{connected.includes(p.id)?"Подключено в этой вкладке":"Не подключено"}</span><button className="outlineAction" onClick={()=>{choose(p.id);setView("playground");}}>{connected.includes(p.id)?"Открыть":"Подключить"} <ArrowUpRight size={13}/></button></div>)}</div><div className="infoBanner"><ShieldCheck size={17}/><span>По соображениям безопасности мы не храним пользовательские API-ключи на сервере. После перезагрузки вкладки ключ нужно ввести заново.</span></div></>}
        {view==="profile"&&<><div className="pageHeading"><div><div className="eyebrow"><Settings size={13}/> ACCOUNT SETTINGS</div><h1>Твой <em>профиль.</em></h1><p>Управление аккаунтом и безопасностью.</p></div></div><div className="profileCard"><div className="profileAvatar">{account.email.slice(0,1).toUpperCase()}</div><div><small>EMAIL ACCOUNT</small><b>{account.email}</b><span className="roleBadge">{account.role==="admin"?"ADMINISTRATOR":"MEMBER"}</span></div></div><section className="panel passwordPanel"><h3>Изменить пароль</h3><p>Используй длинный уникальный пароль (не менее 10 символов).</p><label className="fieldLabel">ТЕКУЩИЙ ПАРОЛЬ</label><input className="profileInput" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><label className="fieldLabel">НОВЫЙ ПАРОЛЬ</label><input className="profileInput" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><button className="activate profileSave" onClick={changePassword}>Сохранить новый пароль <ArrowUpRight size={15}/></button>{profileNotice&&<div className="notice">{profileNotice}</div>}</section></>}
        {view==="admin"&&<><div className="pageHeading"><div><div className="eyebrow"><Users size={13}/> ADMINISTRATION</div><h1>Admin <em>Panel.</em></h1><p>Сводная информация о платформе.</p></div></div>{adminData?<><div className="statsGrid"><div className="statCard"><span>АККАУНТЫ</span><b>{adminData.users}</b><small>Всего зарегистрировано</small></div><div className="statCard"><span>ДИАЛОГИ</span><b>{adminData.chats}</b><small>Сохранено в базе</small></div><div className="statCard"><span>AI ЗАПРОСЫ</span><b>{adminData.requests}</b><small>Успешные обращения</small></div></div><section className="panel adminTable"><h3>Последние аккаунты</h3>{adminData.recent?.map((u:any)=><div className="adminUser" key={u.email}><span>{u.email}</span><small>{u.role}</small></div>)}</section></>:<div className="emptyHint">Загружаем статистику администратора…</div>}</>}
        <footer>BUILT FOR THE AI ERA <span>·</span> YOUR KEYS. YOUR MODELS. YOUR WORKSPACE.</footer>
      </div>
    </section>
  </main>;
}
