import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, CircleHelp, Copy, Download, Heart, Info, LockKeyhole, Plus, RotateCcw, ShieldCheck, Sparkles, TrendingDown, Wallet, X } from 'lucide-react';
import { calculate, currency, dateAfter, insight, isoLocalDate, safeMoney, type Expense } from './calculations';
import { downloadCard, shareCaption } from './card';
const KEY='dozhit-v1';
const starter: Expense[]=[
  {id:'rent',label:'Жильё и коммуналка',amount:55000,frequency:'once'},
  {id:'credit',label:'Кредиты / обязательные платежи',amount:40000,frequency:'once'},
  {id:'food',label:'Продукты и питание',amount:3000,frequency:'daily'},
  {id:'transport',label:'Транспорт',amount:1200,frequency:'daily'},
  {id:'other',label:'Кофе, доставка и другое',amount:800,frequency:'daily'},
];
type Saved={balance:number;payday:string;expenses:Expense[];cuts:Record<string,number>};
function initial(): Saved {return {balance:230000,payday:dateAfter(20),expenses:starter,cuts:{}};}
function NumberField({value,onChange,label,note}:{value:number;onChange:(n:number)=>void;label:string;note?:string}){
  return <label className="block"><span className="field-label">{label}</span><div className="money-field"><input aria-label={label} type="number" min="0" max="1000000000" step="100" inputMode="decimal" value={value} onChange={e=>onChange(safeMoney(e.target.value))}/><span>₸</span></div>{note&&<span className="muted text-xs mt-2 block">{note}</span>}</label>;
}
function Card({children,className=''}:{children:React.ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>}
function App(){
  const [data,setData]=useState<Saved>(initial);
  const [remember,setRemember]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [newName,setNewName]=useState('');
  const [newAmount,setNewAmount]=useState(1000);
  const [newFrequency,setNewFrequency]=useState<'once'|'daily'>('daily');
  const [toast,setToast]=useState('');
  const [advanced,setAdvanced]=useState(false);
  useEffect(()=>{
    try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw) as Saved;
      if(Array.isArray(parsed.expenses)&&typeof parsed.payday==='string'){
        setData({balance:safeMoney(parsed.balance),payday:parsed.payday,expenses:parsed.expenses.slice(0,30).filter(x=>x&&typeof x.label==='string'&&(x.frequency==='once'||x.frequency==='daily')).map(x=>({id:String(x.id),label:x.label.slice(0,70),amount:safeMoney(x.amount),frequency:x.frequency})),cuts:parsed.cuts&&typeof parsed.cuts==='object'?parsed.cuts:{}});setRemember(true);
      }
    }}catch{/* malformed storage should not break app */}setHydrated(true);
  },[]);
  useEffect(()=>{if(!hydrated)return;try{if(remember)localStorage.setItem(KEY,JSON.stringify(data));else localStorage.removeItem(KEY);}catch{/* storage unavailable */}},[data,remember,hydrated]);
  const today=isoLocalDate(new Date());
  const result=useMemo(()=>calculate({...data,today}),[data,today]);
  const update=(patch:Partial<Saved>)=>setData(prev=>({...prev,...patch}));
  const changeExpense=(id:string,amount:number)=>update({expenses:data.expenses.map(e=>e.id===id?{...e,amount}:e)});
  const removeExpense=(id:string)=>update({expenses:data.expenses.filter(e=>e.id!==id)});
  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),3200)};
  const copy=async()=>{try{await navigator.clipboard.writeText(shareCaption(result));notify('Текст для Threads скопирован')}catch{notify('Не удалось скопировать текст')}};
  const exportImage=async()=>{try{await downloadCard(result);notify('Карточка PNG готова')}catch{notify('Не удалось создать карточку')}};
  const totalBaseline=Math.max(0,result.expenseTotal);
  const fixedPercent=totalBaseline===0?0:Math.min(100,result.fixed/totalBaseline*100);
  const addExpense=()=>{const name=newName.trim();if(!name)return;update({expenses:[...data.expenses,{id:`custom-${Date.now()}`,label:name.slice(0,70),amount:safeMoney(newAmount),frequency:newFrequency}]});setShowAdd(false);setNewName('');setNewAmount(1000);};
  const status=result.days===0?'Выбери дату':result.available<0?'Обязательные расходы выше остатка':result.hasDeficit?'Есть риск не дотянуть':'По плану хватит';
  return <div className="app-shell"><div className="ambient ambient-a"/><div className="ambient ambient-b"/>
    <header className="site-header"><div className="brand"><span className="brand-mark"><TrendingDown size={20}/></span><div><b>до зарплаты<span className="lime">.</span></b><span className="brand-sub">финансы без иллюзий</span></div></div><span className="header-chip"><span className="chip-dot"/> бесплатный калькулятор</span></header>
    <main className="content">
      <div className="hero"><span className="eyebrow"><Sparkles size={13}/> ПОСМОТРИ НА ДЕНЬГИ ПО-НОВОМУ</span><h1>Зарплата есть.<br/><span className="lime">А деньги где?</span></h1><p>Узнай, хватит ли твоих денег до следующей выплаты. Никаких банков, регистраций и сложных таблиц.</p><div className="hero-foot"><span><ShieldCheck size={16}/> Твои цифры остаются у тебя</span><span><Wallet size={16}/> Суммы в тенге</span></div></div>
      <div className="desktop-grid"><div className="left-column">
        <Card><div className="section-top"><span className="step">01</span><div><h2>Твои деньги</h2><p>Сколько у тебя сейчас и когда выплата?</p></div></div><NumberField label="Доступно сейчас" note="Вводи остаток на руках и счетах, а не месячную зарплату." value={data.balance} onChange={n=>update({balance:n})}/><label className="block mt-5"><span className="field-label">Следующая зарплата</span><div className="date-field"><CalendarDays size={20}/><input type="date" aria-label="Дата следующей зарплаты" min={today} max={dateAfter(366)} value={data.payday} onChange={e=>update({payday:e.target.value})}/></div></label><div className="days-chip"><CalendarDays size={15}/> {result.days>0?`До выплаты ${result.days} дн.`:'Выбери будущую дату'}</div></Card>
        <Card><div className="section-top"><span className="step">02</span><div><h2>На что уходят деньги?</h2><p>Платежи до зарплаты и средние траты за день.</p></div></div><div className="expense-list">{data.expenses.map(e=><div className="expense-row" key={e.id}><div className="expense-detail"><span className="expense-label">{e.label}</span><span className="frequency">{e.frequency==='once'?'Один раз до зарплаты':'В среднем за день'}</span></div><div className="expense-control"><input aria-label={`Сумма: ${e.label}`} type="number" min="0" max="1000000000" value={e.amount} onChange={v=>changeExpense(e.id,safeMoney(v.target.value))}/><span>₸</span></div><button className="icon-btn" aria-label={`Удалить ${e.label}`} title="Удалить расход" onClick={()=>removeExpense(e.id)}><X size={15}/></button></div>)}</div>{showAdd?<div className="new-expense"><input className="text-input" aria-label="Название расхода" placeholder="Например, интернет" maxLength={70} value={newName} onChange={e=>setNewName(e.target.value)}/><div className="new-line"><input className="text-input" type="number" aria-label="Сумма нового расхода" min="0" value={newAmount} onChange={e=>setNewAmount(safeMoney(e.target.value))}/><select className="text-input" aria-label="Периодичность расхода" value={newFrequency} onChange={e=>setNewFrequency(e.target.value as 'once'|'daily')}><option value="once">Разово</option><option value="daily">Ежедневно</option></select></div><div className="new-actions"><button className="btn btn-soft" onClick={()=>setShowAdd(false)}>Отмена</button><button className="btn btn-lime" onClick={addExpense} disabled={!newName.trim()}>Добавить</button></div></div>:<button className="add-button" onClick={()=>setShowAdd(true)} disabled={data.expenses.length>=30}><Plus size={18}/> Добавить расход</button>}</Card>
        <Card><div className="section-top"><span className="step">03</span><div><h2>Что, если сократить траты?</h2><p>Двигай ползунки и смотри разницу.</p></div></div><div className="scenario-list">{data.expenses.filter(e=>e.frequency==='daily'&&e.amount>0).map(e=><div className="scenario" key={e.id}><div className="scenario-head"><span>{e.label}</span><strong>−{Math.min(100,Math.max(0,data.cuts[e.id]||0))}%</strong></div><input type="range" aria-label={`Сокращение: ${e.label}`} min="0" max="100" step="5" value={data.cuts[e.id]||0} onChange={v=>update({cuts:{...data.cuts,[e.id]:Number(v.target.value)}})}/><div className="scenario-hint"><span>{currency(e.amount)}/день</span><span>{currency(e.amount*(1-(data.cuts[e.id]||0)/100))}/день</span></div></div>)}{!data.expenses.some(e=>e.frequency==='daily'&&e.amount>0)&&<p className="muted text-sm">Добавь ежедневные расходы, чтобы увидеть сценарии экономии.</p>}</div><div className="savings-row"><span><Sparkles size={16}/> Экономия до выплаты</span><strong>+{currency(result.reduction)}</strong></div></Card>
      </div><div className="right-column"><Card className="result-card"><div className="result-top"><span className="eyebrow"><span className="pulse-dot"/> ТВОЙ ПРОГНОЗ</span><span className={`status ${result.days===0?'neutral':result.hasDeficit?'bad':'good'}`}>{status}</span></div><p className="result-title">К следующей зарплате останется</p><div className={`big-money ${result.projected<0?'negative':''}`}>{result.projected<0?'−':''}{currency(Math.abs(result.projected))}</div><p className="result-description">{insight(result)}</p><div className="progress-track"><div style={{width:`${Math.max(0,Math.min(100,result.days?Math.max(0,result.projected)/Math.max(1,data.balance)*100:0))}%`}}/></div><div className="stats-grid"><div><span>Дневной лимит*</span><strong>{currency(result.allowance)}</strong></div><div><span>Хватит при таком темпе</span><strong>{result.runwayDays===null?'∞':`${Math.max(0,result.runwayDays)} дн.`}</strong></div><div><span>Обязательные платежи</span><strong>{currency(result.fixed)}</strong></div><div><span>Траты за день с экономией</span><strong>{currency(result.dailyAfterCuts)}</strong></div></div><p className="small-note">* Доступный остаток после обязательных платежей, разделённый на дни до выплаты. Не является финансовой рекомендацией.</p></Card>
        <Card className="visual-card"><div className="card-heading"><h2>Из чего состоит план</h2><button className="tooltip-button" onClick={()=>setAdvanced(!advanced)} aria-label="Показать пояснение"><CircleHelp size={18}/></button></div><div className="stack-bar"><div style={{width:`${fixedPercent}%`}} className="fixed-segment"/><div style={{width:`${100-fixedPercent}%`}} className="daily-segment"/></div><div className="legend"><div><i className="fixed-dot"/><span>Разовые платежи</span><b>{currency(result.fixed)}</b></div><div><i className="daily-dot"/><span>Повседневные траты</span><b>{currency(result.daily*result.days)}</b></div></div>{advanced&&<div className="info-panel"><Info size={16}/> Повседневные траты рассчитываются за все оставшиеся дни. Полоска показывает структуру планируемых расходов до применения экономии.</div>}</Card>
        <Card className="share-card"><div className="share-icon"><ArrowUpRight size={24}/></div><h2>А друзья доживут?</h2><p>Сохрани карточку для Threads. Твои суммы не попадут в изображение.</p><div className="share-preview"><span>ДОЖИТЬ ДО ЗАРПЛАТЫ</span><strong>{result.days===0?'ВЫБЕРИ ДАТУ':result.hasDeficit?'ДЕНЕГ НЕ ХВАТИТ':'ДЕНЕГ ХВАТИТ'}</strong><small>А сколько дней хватит тебе?</small></div><div className="share-actions"><button className="btn btn-lime" onClick={exportImage}><Download size={18}/> Скачать PNG</button><button className="btn btn-outline" onClick={copy}><Copy size={18}/> Текст поста</button></div><p className="small-note">Карточка 1080×1350 px для публикации в ленте. В Threads прикрепи её к своему посту.</p></Card>
      </div></div>
      <div className="privacy-line"><LockKeyhole size={17}/><div><strong>Приватность — по умолчанию</strong><p>Все расчёты выполняются в браузере. Мы не используем сервер, аккаунты или аналитику.</p></div></div>
      <div className="bottom-controls"><label className="save-toggle"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span className="switch"/><span>Запоминать мои данные на этом устройстве</span></label><button className="reset-button" onClick={()=>{if(window.confirm('Сбросить все поля и удалить сохранённые данные?')){setData(initial());setRemember(false);try{localStorage.removeItem(KEY)}catch{}notify('Данные сброшены')}}}><RotateCcw size={16}/> Сбросить</button></div>
    </main><footer><span>до зарплаты<span className="lime">.</span></span><div><Heart size={14}/> Сделано, чтобы деньги стали понятнее</div><p>Прогноз строится на ваших предположениях и может отличаться от фактических расходов.</p></footer>{toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}
export default App;
