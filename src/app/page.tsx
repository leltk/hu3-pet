import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <section className="room">
        <div className="window" />
        <div className="desk">
          <div className="monitor">
            <div className="screen">
              <span>HU3 PET</span>
              <strong>RANQUEADA</strong>
            </div>
          </div>
          <div className="keyboard" />
        </div>

        <div className="pet">
          <div className="eyes"><i /><i /></div>
          <div className="mouth" />
          <div className="feet"><i /><i /></div>
        </div>

        <div className="hud">
          <div><small>RANK</small><strong>FERRO IV</strong></div>
          <div><small>LP</small><strong>0 / 100</strong></div>
          <div><small>STRESS</small><strong>0%</strong></div>
        </div>
      </section>

      <section className="intro">
        <p className="eyebrow">HU3 PET · MVP</p>
        <h1>Seu pet quer virar Challenger.</h1>
        <p>
          Treine, descanse, melhore o setup e mande seu pet para a ranqueada.
          A partida acontece enquanto você espera.
        </p>
        <Link className="start-button" href="/game">Começar jornada</Link>
      </section>
    </main>
  );
}
