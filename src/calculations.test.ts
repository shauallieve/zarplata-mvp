import { describe,it,expect } from 'vitest';
import { calculate,daysBetween,dateAfter,isoLocalDate } from './calculations';
describe('budget calculations',()=>{
  it('uses calendar days including month boundary',()=>{expect(daysBetween('2026-11-28','2026-12-03')).toBe(5)});
  it('never counts negative days',()=>{expect(daysBetween('2026-11-03','2026-11-02')).toBe(0)});
  it('handles once and daily expenses',()=>{const r=calculate({balance:200000,today:'2026-11-01',payday:'2026-11-11',expenses:[{id:'a',label:'rent',amount:50000,frequency:'once'},{id:'b',label:'food',amount:5000,frequency:'daily'}],cuts:{}});expect(r.projected).toBe(100000);expect(r.allowance).toBe(15000);expect(r.runwayDays).toBe(30)});
  it('handles savings without reducing fixed expenses',()=>{const r=calculate({balance:100000,today:'2026-11-01',payday:'2026-11-11',expenses:[{id:'a',label:'rent',amount:50000,frequency:'once'},{id:'b',label:'food',amount:8000,frequency:'daily'}],cuts:{b:50,a:100}});expect(r.baselineProjected).toBe(-30000);expect(r.projected).toBe(10000);expect(r.reduction).toBe(40000)});
  it('handles no spending and past payments',()=>{const r=calculate({balance:1000,today:'2026-11-03',payday:'2026-11-03',expenses:[],cuts:{}});expect(r.days).toBe(0);expect(r.runwayDays).toBe(null)});
  it('computes local dates without UTC shifts',()=>{const d=new Date(2026,10,3,23);expect(isoLocalDate(d)).toBe('2026-11-03');expect(dateAfter(2,new Date(2026,10,3))).toBe('2026-11-05')});
});
