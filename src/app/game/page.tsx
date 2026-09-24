import "./game.css";
import { useEffect, useState } from "react";

type Pet = {
  id: string;
  name: string;
  species: string;
  color: string;
  rank_tier: string;
  rank_division: number;
  lp: number;
  cs: number;
  positioning: number;
  skillshots: number;
  dodge: number;
  combat: number;
  mechanics: number;
  vision: number;
  objectives: number;
  rotations: number;
  wave_control: number;
  decision_making: number;
  stamina: number;
  stress: number;
  luck: number;
  xp: number;
  coins: number;
  next_ranked_at: string | null;
};

type Match = { id: string; finishesAt: string };

const micro = ["cs","positioning","skillshots","dodge","combat","mechanics"] as const;
const macro = ["vision","objectives","rotations","wave_control","decision_making"] as const;

export default function GamePage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [name, setName] = useState("Pudim");
  const [match, setMatch] = useState<Match | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("Seu pet quer virar Challenger.");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!pet) return;
    const r = await fetch(`/api/pets?id=${pet.id}`);
    if (r.ok) setPet(await r.json());
  };

  const create = async () => {
    setBusy(true);
    const r = await fetch("/api/pets", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({name, species:"blob", color:"green"})
    });
    if (r.ok) setPet(await r.json());
    setBusy(false);
  };

  const startRanked = async () => {
    if (!pet) return;
    setBusy(true);
    const r = await fetch("/api/ranked/start", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({petId:pet.id})
    });
    const data = await r.json();
    if (r.ok) {
      setMatch({id:data.matchId, finishesAt:data.finishesAt});
      setMessage("🎮 O pet entrou na fila. Agora é sobreviver aos 30 minutos.");
      setRemaining(Math.max(0, new Date(data.finishesAt).getTime() - Date.now()));
    } else {
      setMessage(data.error ?? "Não foi possível iniciar.");
    }
    setBusy(false);
  };

  useEffect(() => {
    if (!match) return;
    const tick = window.setInterval(async () => {
      const left = Math.max(0, new Date(match.finishesAt).getTime() - Date.now());
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(tick);
        const r = await fetch("/api/ranked/resolve", {
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({matchId:match.id})
        });
        const data = await r.json();
        if (r.ok) {
          setMessage(data.win ? `🏆 VITÓRIA! +${data.lpDelta} LP` : `💀 DERROTA. ${data.lpDelta} LP`);
          setPet(data.pet);
        } else {
          setMessage(data.error ?? "Erro ao resolver partida.");
        }
        setMatch(null);
        setRemaining(0);
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [match]);

  if (!pet) {
    return (
      <main className="game-shell">
        <section className="intro-card">
          <div className="pet-big">🐸</div>
          <p className="eyebrow">HU3 PET</p>
          <h1>Seu pet quer virar Challenger.</h1>
          <p>Treine, cuide dele e mande a criatura para a ranqueada.</p>
          <input value={name} maxLength={32} onChange={e=>setName(e.target.value)} placeholder="Nome do pet" />
          <button onClick={create} disabled={busy || !name.trim()}>{busy ? "Criando..." : "Começar jornada"}</button>
        </section>
      </main>
    );
  }

  const avg = (keys: readonly string[]) =>
    Math.round(keys.reduce((sum,k)=>sum + Number(pet[k as keyof Pet] ?? 0),0) / keys.length);

  const ready = !pet.next_ranked_at || new Date(pet.next_ranked_at).getTime() <= Date.now();
  const mm = Math.floor(remaining / 60000).toString().padStart(2,"0");
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2,"0");

  return (
    <main className="game-shell">
      <section className="room">
        <div className="window">🌙</div>
        <div className="desk"><div className="monitor"><span>HU3</span><small>RANQUEADA</small></div><div className="keyboard">⌨️</div></div>
        <div className="pet-big">🐸</div>
        <div className="speech">{message}</div>
      </section>

      <section className="panel">
        <header>
          <div><p className="eyebrow">HU3 PET</p><h1>{pet.name}</h1></div>
          <div className="rank">{pet.rank_tier} {pet.rank_tier === "MASTER" || pet.rank_tier === "GRANDMASTER" || pet.rank_tier === "CHALLENGER" ? "" : pet.rank_division}</div>
        </header>

        <div className="lp"><strong>{pet.lp} LP</strong><span>XP {pet.xp}</span><span>🪙 {pet.coins}</span></div>

        <div className="bars">
          <div>⚡ Stamina <b>{pet.stamina}</b><i><em style={{width:`${pet.stamina}%`}} /></i></div>
          <div>😵 Stress <b>{pet.stress}</b><i><em style={{width:`${pet.stress}%`}} /></i></div>
        </div>

        <div className="stats">
          <article><h3>🎯 MICRO <b>{avg(micro)}</b></h3>{micro.map(k=><div key={k}><span>{k.replace("_"," ")}</span><b>{pet[k]}</b></div>)}</article>
          <article><h3>🧠 MACRO <b>{avg(macro)}</b></h3>{macro.map(k=><div key={k}><span>{k.replace("_"," ")}</span><b>{pet[k]}</b></div>)}</article>
        </div>

        {match ? (
          <div className="match-card"><strong>🎮 EM PARTIDA</strong><span>{mm}:{ss}</span><small>O servidor resolve o resultado quando acabar.</small></div>
        ) : (
          <button className="ranked" onClick={startRanked} disabled={busy || !ready}>
            {ready ? "🎮 JOGAR RANQUEADA" : "⏳ RECUPERANDO..."}
          </button>
        )}

        <button className="ghost" onClick={refresh}>Atualizar status</button>
      </section>
    </main>
  );
}
