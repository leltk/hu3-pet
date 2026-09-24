"use client";

import "./game.css";
import { useEffect, useState } from "react";
import InventoryModal from "./InventoryModal";
import MissionsPanel from "./MissionsPanel";

type Pet = {
  id: string; name: string; species: string; color: string;
  rank_tier: string; rank_division: number; lp: number;
  cs: number; positioning: number; skillshots: number; dodge: number; combat: number; mechanics: number;
  vision: number; objectives: number; rotations: number; wave_control: number; decision_making: number;
  stamina: number; stress: number; luck: number; xp: number; coins: number; next_ranked_at: string | null;
};

type Match = { id: string; finishesAt: string };

type OfflineReport = {
  awayMinutes: number;
  passiveXp: number;
  passiveCoins: number;
  events: string[];
};

type EquippedVisual = { icon:string; name:string; slot:string; visual?:Record<string,string> };

type PetLoad = {
  pet: Pet;
  offlineReport: OfflineReport | null;
  pendingMatch: Match | null;
};

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
  const [petMood,setPetMood]=useState<"idle"|"happy"|"tired"|"tilt">("idle");
  const [showMatch,setShowMatch]=useState(false);
  const [matchPhase,setMatchPhase]=useState("Preparando a fila...");
  const [matchEvents,setMatchEvents]=useState<string[]>([]);
  const [history,setHistory]=useState<any[]>([]);
  const [offlineReport,setOfflineReport]=useState<OfflineReport|null>(null);
  const [showInventory,setShowInventory]=useState(false);
  const [equippedVisuals,setEquippedVisuals]=useState<EquippedVisual[]>([]);
  const [testMode,setTestMode]=useState(false);
  const [testMessage,setTestMessage]=useState("");
  const [testRankedMs,setTestRankedMs]=useState(1800000);


  const loadHistoryById=async(id:string)=>{
    const r=await fetch(`/api/ranked/history?petId=${id}`);
    if(r.ok)setHistory(await r.json());
  };

  const loadEquipment=async(id:string)=>{
    const r=await fetch(`/api/inventory?petId=${id}`);
    if(r.ok){
      const items=await r.json();
      setEquippedVisuals(items.filter((item:any)=>item.equippedSlot).map((item:any)=>({icon:item.icon,name:item.name,slot:item.equippedSlot,visual:item.visual??{}})));
    }
  };

  const loadHistory=async()=>{ if(pet) await loadHistoryById(pet.id); };

  const refresh=async()=>{
    if(!pet)return;
    const r=await fetch(`/api/pets?id=${pet.id}`);
    if(r.ok){
      const data=await r.json();
      setPet(data.pet);
      setOfflineReport(data.offlineReport ?? null);
      await loadHistoryById(pet.id);
    }
  };

  useEffect(()=>{
    fetch("/api/dev/timers").then(r=>r.ok?r.json():null).then(data=>{
      if(data?.enabled){ setTestMode(true); setTestRankedMs(data.timers.rankedMs); }
    }).catch(()=>{});

    const savedId=window.localStorage.getItem("hu3-pet-id");
    if(!savedId)return;

    const loadSavedPet=async()=>{
      const r=await fetch(`/api/pets?id=${savedId}`);
      if(!r.ok){
        window.localStorage.removeItem("hu3-pet-id");
        return;
      }
      const data:PetLoad=await r.json();
      setPet(data.pet);
      setOfflineReport(data.offlineReport ?? null);

      if(data.pendingMatch){
        const finishTime=new Date(data.pendingMatch.finishesAt).getTime();
        if(finishTime>Date.now()){
          setMatch({id:data.pendingMatch.id,finishesAt:data.pendingMatch.finishesAt});
          setRemaining(Math.max(0,finishTime-Date.now()));
          setShowMatch(true);
          setMessage("🎮 Você voltou. Seu pet ainda está na ranqueada.");
        } else {
          const resolved=await fetch("/api/ranked/resolve",{
            method:"POST",
            headers:{"content-type":"application/json"},
            body:JSON.stringify({matchId:data.pendingMatch.id})
          });
          if(resolved.ok){
            const result=await resolved.json();
            setPet(result.pet);
            setPetMood(result.win?"happy":"tilt");
            setMessage(result.win?`🏆 Você estava fora, mas venceu! +${result.lpDelta} LP`:`💀 Você voltou e a partida terminou em derrota. ${result.lpDelta} LP`);
          }
        }
      }

      await loadHistoryById(savedId);
      await loadEquipment(savedId);
      if(data.offlineReport){
        setActivity(`🌙 Seu pet ficou ${data.offlineReport.awayMinutes} min sozinho e continuou a vida dele.`);
        setPetMood(data.offlineReport.events.some((event:string)=>event.includes("praticando"))?"happy":"idle");
      }
    };

    loadSavedPet();
  }, []);

  const create=async()=>{
    setBusy(true);
    const r=await fetch("/api/pets",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,species:"blob",color:"green"})});
    if(r.ok){
      const created=await r.json();
      setPet(created);
      setOfflineReport(null);
      window.localStorage.setItem("hu3-pet-id",created.id);
      await loadHistoryById(created.id);
      await loadEquipment(created.id);
    }
    setBusy(false);
  };

  const train=async(action:string)=>{
    if(!pet)return; setBusy(true);
    const r=await fetch("/api/training",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id,action})});
    const data=await r.json();
    setActivity(r.ok?"🏋️ "+data.message:"⚠️ "+(data.error??"Não foi possível treinar."));
    if(r.ok)setPetMood(data.pet.stamina<30?"tired":"happy");
    if(r.ok)setPet(data.pet); setBusy(false);
  };

  const rest=async()=>{
    if(!pet)return; setBusy(true);
    const r=await fetch("/api/recovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id})});
    const data=await r.json();
    setActivity(r.ok?data.message:"⚠️ "+(data.error??"Não foi possível descansar."));
    if(r.ok)setPetMood("happy");
    if(r.ok)setPet(data.pet); setBusy(false);
  };

  const runTimerTest=async(action:string)=>{
    if(!pet||!testMode)return;
    setTestMessage("Aplicando teste...");
    const r=await fetch("/api/dev/timers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id,action})});
    const data=await r.json();
    setTestMessage(r.ok?data.message:(data.error??"Falha no teste."));
    if(r.ok){
      if(action==="offline"||action==="all") await refresh();
      if(action==="ranked"||action==="all"){
        const loaded=await fetch(`/api/pets?id=${pet.id}`);
        if(loaded.ok){
          const next=await loaded.json();
          if(next.pendingMatch){
            setMatch({id:next.pendingMatch.id,finishesAt:next.pendingMatch.finishesAt});
            setRemaining(0);
            setShowMatch(true);
          }
        }
      }
    }
  };

  const startRanked=async()=>{
    if(!pet)return; setBusy(true);
    const r=await fetch("/api/ranked/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({petId:pet.id})});
    const data=await r.json();
    if(r.ok){setMatch({id:data.matchId,finishesAt:data.finishesAt});setMessage("🎮 Partida encontrada. Seu pet entrou no Rift.");setPetMood("idle");setShowMatch(true);setMatchEvents([]);setMatchPhase("Preparando a fila...");setRemaining(Math.max(0,new Date(data.finishesAt).getTime()-Date.now()));}
    else setMessage(data.error??"Não foi possível iniciar.");
    setBusy(false);
  };

  useEffect(()=>{
    if(!match)return;
    const tick=window.setInterval(async()=>{
      const left=Math.max(0,new Date(match.finishesAt).getTime()-Date.now()); setRemaining(left);
      const elapsed=Math.max(0,testRankedMs-left); setMatchPhase(elapsed<testRankedMs*0.1?"🔎 Encontrando adversário...":elapsed<testRankedMs*0.35?"⚔️ Fase de rotas":elapsed<testRankedMs*0.62?"🐉 Disputa de objetivos":elapsed<testRankedMs*0.86?"💥 Teamfights decisivas":"🏆 Últimos minutos da partida");
      if(left===0){
        window.clearInterval(tick);
        const r=await fetch("/api/ranked/resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({matchId:match.id})});
        const data=await r.json();
        if(r.ok){
          setOfflineReport(null);
          const resultMessage=data.drop
            ? (data.win?`🏆 Vitória! +${data.lpDelta} LP · 🎁 ${data.drop.name}`:`💀 Derrota. ${data.lpDelta} LP · 🎁 ${data.drop.name}`)
            : (data.win?`🏆 Vitória! +${data.lpDelta} LP`:`💀 Derrota. ${data.lpDelta} LP`);
          setMessage(resultMessage);
          setPet(data.pet);setPetMood(data.win?"happy":"tilt");setMatchEvents(data.simulation?.events??[]);loadHistory();
        }
        else setMessage(data.error??"Erro ao resolver partida.");
        setMatch(null); setRemaining(0); setShowMatch(false);
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
  const rankIndex=["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"].indexOf(pet.rank_tier);
  const setupLevel=Math.max(1,Math.min(5,Math.floor(rankIndex/2)+1));
  const setupNames=["Setup de Sobrevivência","Setup Básico","Setup Gamer","Setup Competitivo","Setup Challenger"];
  const setupIcons=["🖥️","🖥️⌨️","🖥️⌨️🖱️","🖥️🖥️🎧","🖥️🖥️⚡🏆"];
  const microAvg=avg(micro);
  const macroAvg=avg(macro);

  return (
    <main className="game-shell">
    {testMode&&<aside className="test-console">
      <div className="test-console-head"><span>🧪 MODO TESTE</span><b>Timers acelerados</b></div>
      <div className="test-console-grid">
        <button onClick={()=>runTimerTest("training")}>⚡ Liberar treino</button>
        <button onClick={()=>runTimerTest("ranked")}>🎮 Concluir ranqueada</button>
        <button onClick={()=>runTimerTest("offline")}>🌙 Simular 2h offline</button>
        <button className="test-all" onClick={()=>runTimerTest("all")}>✨ Liberar tudo</button>
      </div>
      <small>{testMessage||"Ranqueada: 15s · treino: sem cooldown · offline: 2h"}</small>
    </aside>}
    <section className="room">
      <img className="room-art" src="/assets/room.svg" alt="" />
      <div className="room-overlay" />
      <div className="room-hud">
        <span className="pill">🌙 Noite</span><span className="pill">🏠 Quarto 01</span>
      </div>
      <div className={`pet-stage mood-${petMood}`}><div className="pet-equipment-visuals">{equippedVisuals.filter(item=>!item.slot.startsWith("ring_")).map((item)=><span className={`worn-item worn-${item.slot} visual-${item.visual?.head??item.visual?.body??item.visual?.boots??item.visual?.accessory??item.visual?.weapon??"default"}`} key={`${item.slot}-${item.name}`} aria-hidden="true" />)}</div><img src="/assets/pet.svg" alt={pet.name} /><div className="pet-shadow" /><span className="pet-spark spark-1">✦</span><span className="pet-spark spark-2">✦</span></div>
      <div className="speech"><span>{message}</span></div>
      <div className={`match-overlay ${showMatch?"visible":""}`}>
        <div className="match-overlay-card">
          <span className="eyebrow">PARTIDA RANQUEADA</span>
          <strong>{matchPhase}</strong>
          {matchEvents.length>0&&<div className="match-events">{matchEvents.map((event,i)=><span key={i}>{event}</span>)}</div>}
          <div className="match-progress"><i style={{width:`${Math.max(2,Math.min(100,100-(remaining/testRankedMs)*100))}%`}} /></div>
          <small>{mm}:{ss} restantes</small>
        </div>
      </div>

      <div className="rank-sticker"><small>RANKED</small><strong>{rankName}</strong><b>{pet.lp} LP</b></div>
    </section>

    <section className="panel">
      <header className="topbar">
        <div><p className="eyebrow">MEU PET</p><h1>{pet.name}</h1></div>
        <div className="currency"><span>🪙 {pet.coins}</span><span>⭐ {pet.xp}</span><button className="inventory-open" onClick={()=>setShowInventory(true)}>🎒 Inventário</button></div>
      </header>

      <div className="condition-grid">
        <div className="meter"><div><span>⚡ Stamina</span><b>{pet.stamina}</b></div><i><em style={{width:`${pet.stamina}%`}}/></i></div>
        <div className="meter"><div><span>😵 Stress</span><b>{pet.stress}</b></div><i><em className="stress-fill" style={{width:`${pet.stress}%`}}/></i></div>
      </div>

      {offlineReport && (
        <div className="offline-card">
          <div className="offline-head">
            <span>🌙 ENQUANTO VOCÊ ESTAVA FORA</span>
            <button onClick={()=>setOfflineReport(null)} aria-label="Fechar resumo">×</button>
          </div>
          <strong>Seu pet continuou vivendo.</strong>
          <p>Ficou <b>{offlineReport.awayMinutes} min</b> sozinho · +{offlineReport.passiveXp} XP · +{offlineReport.passiveCoins} 🪙</p>
          {offlineReport.events.map((event,i)=><span key={i}>{event}</span>)}
        </div>
      )}

      <div className="activity"><span>●</span>{activity}</div>

      <div className="section-title"><div><small>PROGRESSÃO</small><h2>Treinar</h2></div><span>MICRO {microAvg} · MACRO {macroAvg}</span></div>
      <div className="training-grid">
        {[...micro,...macro].map(([key,label])=><button key={key} onClick={()=>train(key)} disabled={busy}><span>{key==="cs"?"🎯":key==="positioning"?"👟":key==="skillshots"?"✨":key==="dodge"?"🌀":key==="combat"?"⚔️":key==="mechanics"?"🎮":key==="vision"?"👁️":key==="objectives"?"🐉":key==="rotations"?"🗺️":key==="wave_control"?"🌊":"🧠"}</span><strong>{label}</strong><small>{pet[key]}</small></button>)}
      </div>

      <div className="action-row">
        <button className="rest" onClick={rest} disabled={busy}>💤 Descansar <small>+35 energia</small></button>
        {match?<div className="match-card"><div><span>🎮 EM PARTIDA</span><small>O servidor está jogando por você.</small></div><strong>{mm}:{ss}</strong></div>:<button className="ranked" onClick={startRanked} disabled={busy||!ready}>🎮 <span>{ready?"JOGAR RANQUEADA":"RECUPERANDO..."}</span></button>}
      </div>

      <div className="history">
        <div className="section-title"><div><small>REGISTRO</small><h2>Últimas partidas</h2></div><span>{history.length} salvas</span></div>
        {history.length===0?<div className="history-empty">Ainda não há partidas concluídas.</div>:history.slice(0,4).map((m)=><div className="history-row" key={m.id}>
          <b className={m.result==="WIN"?"win":"loss"}>{m.result==="WIN"?"VITÓRIA":"DERROTA"}</b>
          <span>{m.micro_score} micro · {m.macro_score} macro</span><strong>{m.lp_delta>0?"+":""}{m.lp_delta} LP</strong>
        </div>)}
      </div>
      <div className="mini-stats"><span>🍀 Sorte <b>{pet.luck}</b></span><span>🎯 Micro <b>{microAvg}</b></span><span>🧠 Macro <b>{macroAvg}</b></span></div>
    </section>
    {showInventory&&<InventoryModal petId={pet.id} onClose={()=>setShowInventory(false)} onChanged={()=>loadEquipment(pet.id)} />}
    <MissionsPanel petId={pet.id} onChanged={(nextPet)=>setPet(nextPet)} />
  </main>
  );
}
