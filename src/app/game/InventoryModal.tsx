"use client";

import { useEffect, useState } from "react";
import { EQUIPMENT_SLOTS, aggregateEffects, type InventoryItem } from "@/lib/game/inventory";

type Props = { petId: string; onClose:()=>void };

const rarityLabel: Record<string,string> = {
  common:"Comum", rare:"Raro", epic:"Épico", legendary:"Lendário"
};

export default function InventoryModal({petId,onClose}:Props) {
  const [items,setItems]=useState<InventoryItem[]>([]);
  const [selected,setSelected]=useState<InventoryItem|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  const load=async()=>{
    setLoading(true);
    const r=await fetch(`/api/inventory?petId=${petId}`);
    if(r.ok)setItems(await r.json());
    setLoading(false);
  };

  useEffect(()=>{load()},[petId]);

  const equip=async(item:InventoryItem)=>{
    if(!item.slot)return;
    setBusy(true);
    const r=await fetch("/api/inventory/equip",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({petId,itemId:item.id})
    });
    if(r.ok) await load();
    setBusy(false);
  };

  const unequip=async(slot:string)=>{
    setBusy(true);
    const r=await fetch("/api/inventory/unequip",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({petId,slot})
    });
    if(r.ok) await load();
    setBusy(false);
  };

  const equipped=items.filter(i=>i.equippedSlot);
  const effects=aggregateEffects(items);
  const backpack=items.filter(i=>!i.equippedSlot);
  const itemForSlot=(slot:string)=>equipped.find(i=>i.equippedSlot===slot);

  return <div className="inventory-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="inventory-window">
      <header className="inventory-header">
        <div><p className="eyebrow">EQUIPAMENTO</p><h2>Inventário</h2></div>
        <button onClick={onClose} className="inventory-close">×</button>
      </header>

      <div className="inventory-layout">
        <div className="equipment-paper">
          <div className="equipment-title">EQUIPAMENTO DO PET</div>
          <div className="equipment-grid">
            {EQUIPMENT_SLOTS.map(([slot,label,icon])=>{
              const item=itemForSlot(slot);
              return <button key={slot} className={`equipment-slot ${item?"filled":""} rarity-${item?.rarity??"empty"}`} onClick={()=>item?setSelected(item):null}>
                <span className="slot-icon">{item?.icon??icon}</span>
                <small>{label}</small>
                {item&&<b>{item.name}</b>}
              </button>
            })}
          </div>
          <div className="equipment-effects">
            <span>EFEITOS ATIVOS</span>
            {Object.keys(effects).length===0?<small>Nenhum equipamento.</small>:Object.entries(effects).map(([key,value])=><small key={key}>{key.replaceAll("_"," ")} <b>{value>0?"+":""}{value}{key.includes("pct")||key.includes("chance")?"%":""}</b></small>)}
          </div>
        </div>

        <div className="backpack">
          <div className="backpack-head"><strong>MOCHILA</strong><span>{items.length} / 40 itens</span></div>
          {loading?<div className="inventory-empty">Carregando mochila...</div>:
            <div className="backpack-grid">
              {Array.from({length:40}).map((_,index)=>{
                const item=backpack[index];
                return <button key={index} className={`inventory-cell ${item?"has-item":""} rarity-${item?.rarity??"empty"}`} onClick={()=>item&&setSelected(item)}>
                  {item&&<><span>{item.icon}</span>{item.quantity>1&&<b>{item.quantity}</b>}</>}
                </button>
              })}
            </div>}
          <p className="inventory-tip">Clique em um item para ver detalhes. O equipamento muda a progressão, não decide a partida sozinho.</p>
        </div>
      </div>

      {selected&&<div className="item-inspector">
        <div className="item-art">{selected.icon}</div>
        <div className="item-info">
          <div className="item-name-row"><strong>{selected.name}</strong><span className={`rarity-text rarity-${selected.rarity}`}>{rarityLabel[selected.rarity]??selected.rarity}</span></div>
          <p>{selected.description}</p>
          <small>Origem: {selected.origin??"desconhecida"}{selected.limited?" · LIMITADO":""}</small>
          {Object.entries(selected.effects).map(([key,value])=><div className="item-effect" key={key}>✦ {key.replaceAll("_"," ")}: <b>+{value}{key.includes("pct")||key.includes("chance")?"%":""}</b></div>)}
          <div className="item-actions">
            {selected.slot&&selected.equippedSlot?<button disabled={busy} onClick={()=>unequip(selected.slot!)}>Desequipar</button>:
             selected.slot?<button disabled={busy} onClick={()=>equip(selected)}>Equipar</button>:<span>Consumível — uso em breve</span>}
          </div>
        </div>
      </div>}
    </section>
  </div>;
}
