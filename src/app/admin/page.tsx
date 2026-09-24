"use client";

import { useEffect, useMemo, useState } from "react";
import "./admin.css";

type Pet={id:string;name:string;rank_tier:string;rank_division:number;lp:number;xp:number;coins:number;stamina:number;stress:number;luck:number;item_count:number};
type Item={id:string;name:string;icon:string;rarity:string;category:string};

export default function AdminHome(){
  const [key,setKey]=useState(""); const [pets,setPets]=useState<Pet[]>([]); const [items,setItems]=useState<Item[]>([]);
  const [selectedPet,setSelectedPet]=useState(""); const [selectedItem,setSelectedItem]=useState(""); const [amount,setAmount]=useState(1);
  const [message,setMessage]=useState(""); const [error,setError]=useState("");

  const load=async(k=key)=>{
    if(!k)return;
    const headers={"x-hu3-admin-key":k};
    const [pr,ir]=await Promise.all([fetch("/api/admin/pets",{headers}),fetch("/api/admin/items",{headers})]);
    const pd=await pr.json(); const id=await ir.json();
    if(!pr.ok){setError(pd.error??"Não autorizado");return}
    if(!ir.ok){setError(id.error??"Não foi possível carregar os itens");return}
    setPets(pd);setItems(id.items);setError("");localStorage.setItem("hu3-admin-key",k);
    if(!selectedPet&&pd[0])setSelectedPet(pd[0].id); if(!selectedItem&&id.items[0])setSelectedItem(id.items[0].id);
  };
  useEffect(()=>{const k=localStorage.getItem("hu3-admin-key");if(k){setKey(k);load(k)}},[]);
  const selected=useMemo(()=>pets.find(p=>p.id===selectedPet),[pets,selectedPet]);

  const grant=async()=>{
    if(!selectedPet||!selectedItem)return;setMessage("Entregando...");
    const r=await fetch("/api/admin/grant-item",{method:"POST",headers:{"content-type":"application/json","x-hu3-admin-key":key},body:JSON.stringify({petId:selectedPet,itemId:selectedItem,amount})});
    const d=await r.json(); if(!r.ok){setError(d.error??"Erro");setMessage("");return}
    setMessage(`✓ ${amount} item(ns) entregues. Mochila agora tem ${d.quantity}.`); await load();
  };

  if(!key||error==="Não autorizado")return <main className="admin-shell"><section className="admin-login"><span className="eyebrow">HU3 PET · GAME MASTER</span><h1>Painel do jogo</h1><p>Conteúdo, jogadores e ferramentas de operação do mundo.</p><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="HU3_ADMIN_KEY"/><button onClick={()=>load()}>Entrar</button>{error&&<b className="admin-error">{error}</b>}</section></main>;

  return <main className="admin-shell">
    <header className="admin-top"><div><span className="eyebrow">HU3 PET · GAME MASTER</span><h1>Centro de controle</h1></div><a className="admin-link" href="/admin/items">🎒 Editor de itens</a></header>
    <section className="gm-grid"><article className="gm-card"><span className="eyebrow">MUNDO</span><strong>{pets.length}</strong><small>pets cadastrados</small></article><article className="gm-card"><span className="eyebrow">CATÁLOGO</span><strong>{items.length}</strong><small>itens disponíveis</small></article><article className="gm-card"><span className="eyebrow">OPERAÇÃO</span><strong>ONLINE</strong><small>ferramentas de conteúdo ativas</small></article></section>
    <section className="gm-section"><div className="gm-section-head"><div><span className="eyebrow">JOGADORES</span><h2>Pets</h2></div><button onClick={()=>load()}>↻ Atualizar</button></div><div className="pet-table">{pets.map(p=><button key={p.id} className={selectedPet===p.id?"active":""} onClick={()=>setSelectedPet(p.id)}><span className="pet-dot">●</span><div><strong>{p.name}</strong><small>{p.rank_tier}{["MASTER","GRANDMASTER","CHALLENGER"].includes(p.rank_tier)?"":" "+p.rank_division} · {p.lp} LP</small></div><em>{p.coins} 🪙</em></button>)}{pets.length===0&&<p className="empty">Nenhum pet cadastrado ainda.</p>}</div></section>
    {selected&&<section className="gm-section"><div className="gm-section-head"><div><span className="eyebrow">GM TOOL</span><h2>{selected.name}</h2></div><span className="pet-id">{selected.id}</span></div><div className="pet-metrics"><span>🏆 {selected.rank_tier} {["MASTER","GRANDMASTER","CHALLENGER"].includes(selected.rank_tier)?"":" "+selected.rank_division}</span><span>⭐ {selected.xp} XP</span><span>🪙 {selected.coins}</span><span>⚡ {selected.stamina}</span><span>😵 {selected.stress}</span><span>🍀 {selected.luck}</span></div><div className="grant-box"><div><span className="eyebrow">RECOMPENSA MANUAL</span><h3>Entregar item</h3></div><div className="grant-row"><select value={selectedItem} onChange={e=>setSelectedItem(e.target.value)}>{items.map(i=><option key={i.id} value={i.id}>{i.icon} {i.name} · {i.rarity}</option>)}</select><input type="number" min="1" max="999" value={amount} onChange={e=>setAmount(Math.max(1,Math.min(999,Number(e.target.value)||1)))}/><button onClick={grant}>Entregar</button></div>{message&&<small className="gm-success">{message}</small>}</div></section>}
    <section className="gm-section tools-coming"><span className="eyebrow">PRÓXIMOS MÓDULOS</span><div><b>⚙️ Balance</b><b>🎲 Eventos</b><b>📜 Missões</b><b>🎁 Drops</b><b>🛠️ Setup</b></div></section>
  </main>;
}
