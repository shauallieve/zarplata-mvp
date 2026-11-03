import { type BudgetResult } from './calculations';
export async function downloadCard(result: BudgetResult): Promise<void> {
  const canvas = document.createElement('canvas');
  const w=1080,h=1350;
  canvas.width=w*2; canvas.height=h*2;
  const c=canvas.getContext('2d');
  if (!c) throw new Error('Canvas не поддерживается');
  c.scale(2,2);
  c.fillStyle='#0c100f'; c.fillRect(0,0,w,h);
  c.fillStyle='#18201b';c.beginPath();c.arc(920,90,380,0,Math.PI*2);c.fill();
  c.fillStyle='#c8f76b';c.font='700 32px system-ui, Arial';c.fillText('ДОЖИТЬ ДО ЗАРПЛАТЫ',74,110);
  c.fillStyle='#f5f7f1';c.font='bold 76px system-ui, Arial';c.fillText('А ТЫ ДОЖИВЁШЬ',74,295);c.fillText('ДО ЗАРПЛАТЫ?',74,386);
  c.fillStyle='#9fa9a1';c.font='34px system-ui, Arial';c.fillText('Мой результат без личных сумм',74,480);
  c.fillStyle='#18211b'; roundRect(c,72,565,936,470,40);c.fill();
  c.fillStyle='#a6b5a8';c.font='30px system-ui, Arial';c.fillText('ПРОГНОЗ',124,650);
  const headline = result.days===0 ? 'УКАЖИ ДАТУ' : result.projected<0?'ДЕНЕГ НЕ ХВАТИТ':'ДЕНЕГ ХВАТИТ';
  c.fillStyle=result.projected<0?'#ffb094':'#c8f76b';c.font='bold 55px system-ui, Arial';c.fillText(headline,124,740);
  c.fillStyle='#f5f7f1';c.font='40px system-ui, Arial';
  const explanation=result.days===0?'Выбери дату зарплаты':result.projected<0?`Дефицит: ${result.runwayDays ?? 0} дней запаса`:`До зарплаты: ${result.days} дн.`;
  c.fillText(explanation,124,820);
  c.font='30px system-ui, Arial';c.fillStyle='#a6b5a8';c.fillText('Мои суммы остаются только у меня',124,950);
  c.fillStyle='#c8f76b';roundRect(c,72,1096,936,116,30);c.fill();
  c.fillStyle='#0c100f';c.font='bold 40px system-ui, Arial';c.fillText('А сколько дней хватит тебе?',120,1168);
  c.fillStyle='#839087';c.font='26px system-ui, Arial';c.fillText('Бесплатный симулятор • без регистрации',74,1286);
  const blob=await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Не удалось создать PNG');
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dozhit-do-zarplaty-threads.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
export function shareCaption(r: BudgetResult): string {
  const diagnosis=r.days===0?'Я считаю свой бюджет':r.projected<0?'Мой план расходов не дотягивает до зарплаты':'По моему плану денег должно хватить до зарплаты';
  return `${diagnosis}. Проверил(а) себя в бесплатном калькуляторе «Дожить до зарплаты» 💸\nА у тебя сколько дней до выплаты?`;
}
