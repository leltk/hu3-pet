"use client";

import { useEffect, useState } from "react";
import "../admin.css";

const emptyMission={id:"",name:"",description:"",trigger:"training",target:5,period:"daily",rewards:'{"xp":50,"coins":20}'};
const emptyEvent={id:"",title:"",description:"",rarity:"common",rewards:'{"xp":20}'};

export default function ContentAdmin(){
  const [key,setKey]=useState(""); const [data,setData]=useState<any>({missions:[],events:[]}); const [mission,setMission]=useState(emptyMission); const [event,setEvent]=useState(emptyEvent); const [error,setError]=useState(""); const [ok,setOk]=useState("");
  const load=async(k=key)=>{
    if(!k)return;
    const r=await fetch("/api/admin/content",{headers:{"x-hu3-admin-key":k}});
    const d=await r.json(); if(!r.ok){setError(d.error??"Não autorizado");return}
    setData(d);setError("");localStorage.setItem("hu3-admin-key",k);
  };
  useEffect(()=>{const k=localStorage.getItem("hu3-admin-key");if(k){setKey(k);load(k)}},[]);
  const save=async(type:any,value:any)=>{
    let rewards:any={}; try{rewards=JSON.parse(value.rewards)}catch{setError("JSON de recompensa inválido.");return}
    const r=await fetch("/api/admin/content",{method:"POST",headers:{"content-type":"application/json","x-hu3-admin-key":key},body:JSON.stringify({...value,type,rewards})});
    const d=await r.json(); if(!r.ok){setError(d.error??"Erro");return}
    setOk("Conteúdo salvo.");setError("");await load();
  };
  const disable=async(type:string,id:string)=>{
    await fetch("/api/admin/content",{method:"DELETE",headers:{"content-type":"application/json","x-hu3-admin-key":key},body:JSON.stringify({type,id})});await load();
  };
  if(!key||error==="Não autorizado")return <main className="admin-shell"><section className="admin-login"><span className="eyebrow">HU3 PET · GAME MASTER</span><h1>Conteúdo</h1><p>Missões e encontros sem editar código.</p><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="HU3_ADMIN_KEY"/><button onClick={()=>load()}>Entrar</button>{error&&<b className="admin-error">{error}</b>}</section></main>;
  return <main className="admin-shell">
    <header className="admin-top"><div><span className="eyebrow">GAME MASTER · CONTENT</span><h1>Eventos & Missões</h1></div><a className="admin-link" href="/admin">← Centro de controle</a></header>
    {error&&<b className="admin-error">{error}</b>}{ok&&<div className="gm-success">{ok}</div>}
    <section className="gm-section"><div className="gm-section-head"><div><span className="eyebrow">EDITOR</span><h2>Nova / editar missão</h2></div></div>
      <div className="content-form">{(["id","name","description"] as const).map(k=><input key={k} value={(mission as any)[k]} placeholder={k} onChange={e=>setMission({...mission,[k]:e.target.value})}/>)}
      <select value={mission.trigger} onChange={e=>setMission({...mission,trigger:e.target.value})}><option value="training">Treinos</option><option value="stat_gain">Ganho de habilidade</option><option value="ranked">Ranqueada</option><option value="ranked_win">Vitória</option><option value="item_use">Usar item</option></select>
      <input type="number" min="1" value={mission.target} onChange={e=>setMission({...mission,target:Number(e.target.value)})}/><select value={mission.period} onChange={e=>setMission({...mission,period:e.target.value})}><option value="daily">Diária</option><option value="weekly">Semanal</option></select>
      <input value={mission.rewards} onChange={e=>setMission({...mission,rewards:e.target.value})} placeholder='{"xp":100,"coins":30}'/><button onClick={()=>save("mission",mission)}>Salvar missão</button></div>
    </section>
    <section className="gm-section"><div className="gm-section-head"><div><span className="eyebrow">EDITOR</span><h2>Novo / editar evento</h2></div></div>
      <div className="content-form">{(["id","title","description"] as const).map(k=><input key={k} value={(event as any)[k]} placeholder={k} onChange={e=>setEvent({...event,[k]:e.target.value})}/>)}
      <select value={event.rarity} onChange={e=>setEvent({...event,rarity:e.target.value})}><option value="common">Comum</option><option value="rare">Raro</option><option value="special">Especial</option></select>
      <input value={event.rewards} onChange={e=>setEvent({...event,rewards:e.target.value})} placeholder='{"xp":50,"coins":20}'/><button onClick={()=>save("event",event)}>Salvar evento</button></div>
    </section>
    <section className="gm-section"><div className="gm-section-head"><div><span className="eyebrow">CATÁLOGO</span><h2>Missões ativas</h2></div></div>{data.missions.map((m:any)=><div className="content-row" key={m.id}><div><strong>{m.name}</strong><small>{m.id} · {m.trigger} · {m.target} · {m.period}</small></div><button onClick={()=>{setMission({id:m.id,name:m.name,description:m.description,trigger:m.trigger,target:m.target,period:m.period,rewards:JSON.stringify(m.rewards)})}}>Editar</button><button onClick={()=>disable("mission",m.id)}>Desativar</button></div>)}</section>
    <section className="gm-section"><div className="gm-section-head"><div><span className="eyebrow">CATÁLOGO</span><h2>Eventos ativos</h2></div></div>{data.events.map((e:any)=><div className="content-row" key={e.id}><div><strong>{e.title}</strong><small>{e.id} · {e.rarity}</small></div><button onClick={()=>{setEvent({id:e.id,title:e.title,description:e.description,rarity:e.rarity,rewards:JSON.stringify(e.rewards)})}}>Editar</button><button onClick={()=>disable("event",e.id)}>Desativar</button></div>)}</section>
  </main>;
}
