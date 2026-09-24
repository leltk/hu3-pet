"use client";

import "./game.css";
import { useEffect, useMemo, useState } from "react";

type Pet = {
  id: string; name: string; species: string; color: string;
  rank_tier: string; rank_division: number; lp: number;
  cs: number; positioning: number; skillshots: number; dodge: number; combat: number; mechanics: number;
  vision: number; objectives: number; rotations: number; wave_control: number; decision_making: number;
  stamina: number; stress: number; luck: number; xp: number; coins: number; next_ranked_at: string | null;
};

type Match = { id: string; finishesAt: string };

const micro = [
  ["cs","CS"],["positioning","Posicionamento"],["skillshots","Skillshots"],
  ["dodge","Dodge"],["combat","Combate"],["mechanics","Mecânica"]
] as const;
const macro = [
  ["vision","Visão"],["objectives","Objetivos"],["rotations","Rotação"],
  ["wave_control","Controle de wave"],["decision_making","Decisão"]
] as const;

export default function GamePage() {
  const [pet,setPet]=useState<Pet|null>(null);
  const [name,setName]=useState("Pudim");
  const [match,setMatch]=useState<Match|null>(null);
  const [remaining,setRemaining]=useState(0);
  const [message,setMessage]=useState("Seu pet quer virar Challenger.");
  const [busy,setBusy]=useState(false);
  const [activity,setActivity]=useState("Escolha um treino.");

  const refresh=async()=>{ if(!pet)return; const r=await fetch(`/api/pets?id=${pet.id}`); if(r.ok)setPet(await r.json()); };

  const create=async()=>{
    setBusy(true);
    const r=await fetch("/api/pets",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,species:"blob",color:"green"})});
    if(r.ok)setPet(await r.json());
    setBusy(false);
  };

  const train=async(action:string)=>{
    if(!pet)return; setBusy(true);
    const r=await fetch("/api/training",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id,action})});
    const data=await r.json();
    setActivity(r.ok?"🏋️ "+data.message:"⚠️ "+(data.error??"Não foi possível treinar."));
    if(r.ok)setPet(data.pet); setBusy(false);
  };

  const rest=async()=>{
    if(!pet)return; setBusy(true);
    const r=await fetch("/api/recovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id})});
    const data=await r.json();
    setActivity(r.ok?data.message:"⚠️ "+(data.error??"Não foi possível descansar."));
    if(r.ok)setPet(data.pet); setBusy(false);
  };

  const startRanked=async()=>{
    if(!pet)return; setBusy(true);
    const r=await fetch("/api/ranked/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id})});
    const data=await r.json();
    if(r.ok){setMatch({id:data.matchId,finishesAt:data.finishesAt});setMessage("🎮 Partida encontrada. Seu pet entrou no Rift.");setRemaining(Math.max(0,new Date(data.finishesAt).getTime()-Date.now()));}
    else setMessage(data.error??"Não foi possível iniciar.");
    setBusy(false);
  };

  useEffect(()=>{
    if(!match)return;
    const tick=window.setInterval(async()=>{
      const left=Math.max(0,new Date(match.finishesAt).getTime()-Date.now()); setRemaining(left);
      if(left===0){
        window.clearInterval(tick);
        const r=await fetch("/api/ranked/resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({matchId:match.id})});
        const data=await r.json();
        if(r.ok){setMessage(data.win?`🏆 Vitória! +${data.lpDelta} LP`:`💀 Derrota. ${data.lpDelta} LP`);setPet(data.pet);}
        else setMessage(data.error??"Erro ao resolver partida.");
        setMatch(null); setRemaining(0);
      }
    },1000);
    return()=>window.clearInterval(tick);
  },[match]);

  if(!pet)return(
    <main className="game-shell intro-shell">
      <section className="intro-card">
        <div className="intro-art"><img src="/assets/pet.svg" alt="Pet Hu3" /></div>
        <p className="eyebrow">HU3 PET</p>
        <h1>Seu pet quer virar Challenger.</h1>
        <p>Treine, cuide dele e mande a criatura para a ranqueada.</p>
        <input value={name} maxLength={32} onChange={e=>setName(e.target.value)} placeholder="Nome do pet" />
        <button onClick={create} disabled={busy||!name.trim()}>{busy?"Criando...":"Começar jornada"}</button>
      </section>
    </main>
  );

  const avg=(keys:readonly (readonly [string,string])[])=>Math.round(keys.reduce((s,[k])=>s+Number(pet[k as keyof Pet]??0),0)/keys.length);
  const ready=!pet.next_ranked_at||new Date(pet.next_ranked_at).getTime()<=Date.now();
  const mm=Math.floor(remaining/60000).toString().padStart(2,"0");
  const ss=Math.floor((remaining%60000)/1000).toString().padStart(2,"0");
  const rankName=`${pet.rank_tier}${["MASTER","GRANDMASTER","CHALLENGER"].includes(pet.rank_tier)?"":" "+pet.rank_division}`;
  const microAvg=useMemo(()=>avg(micro),[pet]);
  const macroAvg=useMemo(()=>avg(macro),[pet]);

  return <main className="game-shell">
    <section className="room">
      <img className="room-art" src="/assets/room.svg" alt="" />
      <div className="room-overlay" />
      <div className="room-hud">
        <span className="pill">🌙 Noite</span><span className="pill">🏠 Quarto 01</span>
      </div>
      <div className="pet-stage"><img src="/assets/pet.svg" alt={pet.name} /><div className="pet-shadow" /></div>
      <div className="speech"><span>{message}</span></div>
      <div className="rank-sticker"><small>RANKED</small><strong>{rankName}</strong><b>{pet.lp} LP</b></div>
    </section>

    <section className="panel">
      <header className="topbar">
        <div><p className="eyebrow">MEU PET</p><h1>{pet.name}</h1></div>
        <div className="currency"><span>🪙 {pet.coins}</span><span>⭐ {pet.xp}</span></div>
      </header>

      <div className="condition-grid">
        <div className="meter"><div><span>⚡ Stamina</span><b>{pet.stamina}</b></div><i><em style={{width:`${pet.stamina}%`}}/></i></div>
        <div className="meter"><div><span>😵 Stress</span><b>{pet.stress}</b></div><i><em className="stress-fill" style={{width:`${pet.stress}%`}}/></i></div>
      </div>

      <div className="activity"><span>●</span>{activity}</div>

      <div className="section-title"><div><small>PROGRESSÃO</small><h2>Treinar</h2></div><span>MICRO {microAvg} · MACRO {macroAvg}</span></div>
      <div className="training-grid">
        {[...micro,...macro].map(([key,label])=><button key={key} onClick={()=>train(key)} disabled={busy}><span>{key==="cs"?"🎯":key==="positioning"?"👟":key==="skillshots"?"✨":key==="dodge"?"🌀":key==="combat"?"⚔️":key==="mechanics"?"🎮":key==="vision"?"👁️":key==="objectives"?"🐉":key==="rotations"?"🗺️":key==="wave_control"?"🌊":"🧠"}</span><strong>{label}</strong><small>{pet[key]}</small></button>)}
      </div>

      <div className="action-row">
        <button className="rest" onClick={rest} disabled={busy}>💤 Descansar <small>+35 energia</small></button>
        {match?<div className="match-card"><div><span>🎮 EM PARTIDA</span><small>O servidor está jogando por você.</small></div><strong>{mm}:{ss}</strong></div>:<button className="ranked" onClick={startRanked} disabled={busy||!ready}>🎮 <span>{ready?"JOGAR RANQUEADA":"RECUPERANDO..."}</span></button>}
      </div>

      <div className="mini-stats"><span>🍀 Sorte <b>{pet.luck}</b></span><span>🎯 Micro <b>{microAvg}</b></span><span>🧠 Macro <b>{macroAvg}</b></span></div>
    </section>
  </main>;
}
