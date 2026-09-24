export const RANKS = ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"] as const;
export type RankTier = typeof RANKS[number];
export function applyLp(tier: RankTier, division: number, lp: number, delta: number) {
  let t=tier,d=division,l=lp+delta;
  while(l>=100 && !(t==="CHALLENGER")) {
    l-=100;
    if(t==="MASTER"||t==="GRANDMASTER"){t=t==="MASTER"?"GRANDMASTER":"CHALLENGER";break;}
    if(d>1)d--; else {d=4;t=RANKS[RANKS.indexOf(t)+1];}
  }
  while(l<0 && !(t==="IRON"&&d===4)){
    if(d<4){d++;} else {t=RANKS[Math.max(0,RANKS.indexOf(t)-1)];d=1;}
    l+=100;
  }
  return {tier:t,division:d,lp:Math.max(0,l)};
}