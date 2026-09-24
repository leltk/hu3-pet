"use client";

import { useEffect, useState } from "react";

type Mission = {
  id:string; name:string; description:string; target:number; progress:number;
  period:string; claimed:boolean; rewards:Record<string,unknown>;
};
type EventItem = {
  id:string; title:string; description:string; rarity:string; claimed:boolean;
  rewards:Record<string,unknown>;
};

export default function MissionsPanel({petId,onChanged}:{petId:string;onChanged:(pet:any)=>void}) {
  const [missions,setMissions]=useState<Mission[]>([]);
  const [events,setEvents]=useState<EventItem[]>([]);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  const load=async()=>{
    const [m,e]=await Promise.all([
      fetch(`/api/missions?petId=${petId}`),
      fetch(`/api/events?petId=${petId}`)
    ]);
    if(m.ok)setMissions(await m.json());
    if(e.ok)setEvents(await e.json());
  };

  useEffect(()=>{load()},[petId]);

  const claimMission=async(id:string)=>{
    setBusy(true);
    const r=await fetch("/api/missions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId,missionId:id})});
    const data=await r.json();
    if(r.ok){onChanged(data.pet);setNotice("🎯 Recompensa da missão recebida!");await load();}
    else setNotice("⚠️ "+(data.error??"Não foi possível resgatar."));
    setBusy(false);
  };

  const rollEvent=async()=>{
    setBusy(true);
    const r=await fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId}));
    const data=await r.json();
    if(r.ok&&data.event){setNotice("✨ Um novo evento apareceu!");await load();}
    else setNotice(data.nextRoll?"⏳ Seu pet ainda está em período de espera.":"⚠️ "+(data.error??"Não foi possível gerar evento."));
    setBusy(false);
  };

  const claimEvent=async(id:string)=>{
    setBusy(true);
    const r=await fetch("/api/events/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId,eventId:id})});
    const data=await r.json();
    if(r.ok){onChanged(data.pet);setNotice("🎁 Recompensa do evento recebida!");await load();}
    else setNotice("⚠️ "+(data.error??"Não foi possível resgatar."));
    setBusy(false);
  };

  const completed=missions.filter(m=>m.progress>=m.target&&!m.claimed).length;
  const pendingEvent=events.find(e=>!e.claimed);

  return <section className="missions-panel">
    <button className="missions-banner" onClick={()=>setOpen(v=>!v)}>
      <div><small>ATIVIDADES</small><strong>🎯 Missões & Eventos</strong></div>
      <span>{completed>0?`${completed} pronta`:"Ver progresso"} {pendingEvent?" · ✨ evento":""}</span>
    </button>
    {open&&<div className="missions-window">
      <div className="missions-head">
        <div><small>ROTINA DO PET</small><h2>Missões</h2></div>
        <button onClick={()=>setOpen(false)}>×</button>
      </div>
      {notice&&<div className="missions-notice">{notice}</div>}
      <div className="mission-list">
        {missions.map(m=><div className={`mission-row ${m.progress>=m.target?"done":""}`} key={m.id}>
          <div className="mission-copy"><strong>{m.name}</strong><p>{m.description}</p><i><em style={{width:`${Math.min(100,(m.progress/m.target)*100)}%`}}/></i><small>{Math.min(m.progress,m.target)} / {m.target} · {m.period==="daily"?"diária":"semanal"}</small></div>
          {m.progress>=m.target&&!m.claimed?<button disabled={busy} onClick={()=>claimMission(m.id)}>RESGATAR</button>:m.claimed?<b>✓</b>:<span>🔒</span>}
        </div>)}
      </div>
      <div className="missions-head events-head">
        <div><small>ENCONTROS</small><h2>Eventos</h2></div>
        <button className="roll-event" disabled={busy} onClick={rollEvent}>✨ Procurar</button>
      </div>
      {events.length===0?<div className="event-empty">Nenhum encontro ainda. Seu pet pode encontrar algo especial de tempos em tempos.</div>:
        <div className="event-list">{events.slice(0,4).map(e=><div className={`event-row rarity-${e.rarity}`} key={e.id}>
          <div><strong>{e.title}</strong><p>{e.description}</p><small>{e.rarity}</small></div>
          {!e.claimed?<button disabled={busy} onClick={()=>claimEvent(e.id)}>ABRIR</button>:<b>✓</b>}
        </div>)}</div>}
    </div>}
  </section>;
}
