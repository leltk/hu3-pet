"use client";

import { useEffect, useState } from "react";
import "./admin.css";

type EffectDef={key:string;name:string;description:string;unit:string;scope:string};
type Item={id:string;name:string;description:string;category:string;slot:string|null;rarity:string;icon:string;effects:Record<string,number>;origin:string|null;tradable:boolean;limited:boolean};

const slots=["head","body","weapon","ring_1","ring_2","boots","accessory"];
const rarities=["common","rare","epic","legendary"];

export default function AdminItems(){
  const [key,setKey]=useState("");
  const [items,setItems]=useState<Item[]>([]);
  const [catalog,setCatalog]=useState<EffectDef[]>([]);
  const [selected,setSelected]=useState<Item|null>(null);
  const [error,setError]=useState("");
  const [status,setStatus]=useState("");
  const [form,setForm]=useState<any>({id:"",name:"",description:"",category:"equipment",slot:"head",rarity:"common",icon:"📦",origin:"admin",tradable:true,limited:false,effects:{}});
  const load=async(k=key)=>{
    if(!k)return;
    const r=await fetch("/api/admin/items",{headers:{"x-hu3-admin-key":k}});
    const data=await r.json();
    if(!r.ok){setError(data.error??"Não autorizado");return;}
    setItems(data.items);setCatalog(data.effects);setError("");localStorage.setItem("hu3-admin-key",k);
  };
  useEffect(()=>{const k=localStorage.getItem("hu3-admin-key");if(k){setKey(k);load(k)}},[]);
  const newItem=()=>{setSelected(null);setForm({id:"",name:"",description:"",category:"equipment",slot:"head",rarity:"common",icon:"📦",origin:"admin",tradable:true,limited:false,effects:{}});setStatus("")};
  const edit=(i:Item)=>{setSelected(i);setForm({...i,effects:{...i.effects}});setStatus("")};
  const save=async()=>{
    setStatus("Salvando...");
    const r=await fetch("/api/admin/items",{method:"POST",headers:{"content-type":"application/json","x-hu3-admin-key":key},body:JSON.stringify(form)});
    const d=await r.json();
    if(!r.ok){setError(d.error??"Erro ao salvar");setStatus("");return}
    setStatus("Salvo.");await load();edit(d);
  };
  const remove=async()=>{
    if(!selected||!confirm("Apagar este item?"))return;
    const r=await fetch("/api/admin/items/delete",{method:"POST",headers:{"content-type":"application/json","x-hu3-admin-key":key},body:JSON.stringify({id:selected.id})});
    const d=await r.json();if(!r.ok){setError(d.error??"Erro");return}
    newItem();await load();setStatus("Item apagado.");
  };
  const setEffect=(key:string,value:string)=>{
    const n=Number(value);
    setForm((f:any)=>{const effects={...f.effects};if(!value||Number.isNaN(n)||n===0)delete effects[key];else effects[key]=n;return {...f,effects}});
  };

  if(!key||error==="Não autorizado") return <main className="admin-shell"><section className="admin-login"><span className="eyebrow">HU3 PET · ADMIN</span><h1>Painel de itens</h1><p>Ferramentas de conteúdo do jogo. A chave fica somente neste navegador.</p><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="HU3_ADMIN_KEY"/><button onClick={()=>load()}>Entrar</button>{error&&<b className="admin-error">{error}</b>}</section></main>;

  return <main className="admin-shell">
    <header className="admin-top"><div><span className="eyebrow">HU3 PET · CONTENT</span><h1>Editor de itens</h1></div><button onClick={newItem}>＋ Novo item</button></header>
    <div className="admin-layout">
      <aside className="item-list"><div className="list-title">ITENS <span>{items.length}</span></div>{items.map(i=><button key={i.id} className={selected?.id===i.id?"selected":""} onClick={()=>edit(i)}><span>{i.icon}</span><div><strong>{i.name}</strong><small>{i.id} · {i.rarity}</small></div></button>)}</aside>
      <section className="editor">
        <div className="editor-head"><div><span className="eyebrow">{selected?"EDITANDO":"NOVO ITEM"}</span><h2>{form.name||"Item sem nome"}</h2></div>{selected&&<button className="danger" onClick={remove}>Apagar</button>}</div>
        <div className="form-grid">
          <label>ID interno<input value={form.id} disabled={!!selected} onChange={e=>setForm({...form,id:e.target.value})}/></label>
          <label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Ícone<input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})}/></label>
          <label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value,slot:e.target.value==="equipment"?form.slot:null})}><option value="equipment">Equipamento</option><option value="consumable">Consumível</option><option value="cosmetic">Cosmético</option><option value="material">Material</option></select></label>
          <label>Slot<select value={form.slot??""} disabled={form.category!=="equipment"} onChange={e=>setForm({...form,slot:e.target.value||null})}><option value="">Nenhum</option>{slots.map(s=><option key={s}>{s}</option>)}</select></label>
          <label>Raridade<select value={form.rarity} onChange={e=>setForm({...form,rarity:e.target.value})}>{rarities.map(r=><option key={r}>{r}</option>)}</select></label>
          <label>Origem<input value={form.origin??""} onChange={e=>setForm({...form,origin:e.target.value})}/></label>
          <label>Visual ID<input value={form.visual?.id??""} onChange={e=>setForm({...form,visual:{...(form.visual||{}),id:e.target.value}})}/></label>
        </div>
        <label className="full">Descrição<textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <div className="checks"><label><input type="checkbox" checked={!!form.tradable} onChange={e=>setForm({...form,tradable:e.target.checked})}/> Negociável</label><label><input type="checkbox" checked={!!form.limited} onChange={e=>setForm({...form,limited:e.target.checked})}/> Limitado</label></div>
        <div className="effects-editor"><div className="effects-title"><div><span className="eyebrow">GAMEPLAY</span><h3>Efeitos</h3></div><small>Os tipos vêm do catálogo do jogo.</small></div>{catalog.map(e=><label key={e.key} className="effect-row"><span><strong>{e.name}</strong><small>{e.description}</small></span><input type="number" step="0.1" value={form.effects?.[e.key]??""} placeholder="0" onChange={x=>setEffect(e.key,x.target.value)}/><em>{e.unit==="percent"?"%":"+"}</em></label>)}</div>
        <div className="preview"><div className={`preview-icon rarity-${form.rarity}`}>{form.icon}</div><div><strong>{form.name||"Nome do item"}</strong><p>{form.description||"Descrição..."}</p><small>{Object.entries(form.effects||{}).filter(([,v])=>v).map(([k,v])=>`${k}: +${v}`).join(" · ")||"Sem efeitos"}</small></div></div>
        <button className="save" onClick={save}>{status||"Salvar item"}</button>
      </section>
    </div>
  </main>;
}