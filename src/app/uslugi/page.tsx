export default function UslugiPage() {
  const services = [
    {
      title: "Systemy Alarmowe (SWN)",
      desc: "Zabezpieczamy domy, biura oraz obiekty przemysłowe. Integrujemy systemy sygnalizacji włamania i napadu wiodących producentów. Monitoring powypadkowy i prewencyjny.",
      icon: "🚨",
      image: "/assets/service_alarm.jpg"
    },
    {
      title: "Telewizja Użytkowa (TVU / CCTV)",
      desc: "Wysokiej rozdzielczości monitoring wizyjny wspierany analizą obrazu i sztuczną inteligencją. Podgląd z urządzeń mobilnych oraz autoryzowany zapis na dyskach sieciowych.",
      icon: "📷",
      image: "/assets/service_cctv.jpg"
    },
    {
      title: "Sygnalizacja Pożaru (ASP)",
      desc: "Zapewniamy wczesne wykrywanie zagrożeń pożarowych. Instalujemy i konserwujemy systemy oddymiania i sygnalizacji zgodne z wymogami i certyfikacją.",
      icon: "🔥",
      image: "/assets/service_fire.jpg"
    },
    {
      title: "Kontrola Dostępu i RCP",
      desc: "Zarządzenie przepływem osób w budynku. Rejestracja czasu pracy, zamki biometryczne, inteligentne karty i integracja z systemami kadrowymi.",
      icon: "🔒",
      image: "/assets/service_access.jpg"
    }
  ];

  return (
    <div className="inner-page">
      {/* Baner Tytułowy */}
      <section style={{ backgroundColor: "var(--bg-light)", padding: "100px 0 50px" }}>
        <div className="container text-center">
          <span className="section-tag">Nasza Oferta</span>
          <h1 className="section-title">Usługi Instalacyjne</h1>
          <div className="title-underline center"></div>
          <p className="section-desc">
            CEL-TRONICS to wieloletnie doświadczenie, nowatorskie rozwiązania i profesjonalna
            obsługa. Specjalizujemy się w doborze, montażu i konserwacji instalacji teletechnicznych.
          </p>
        </div>
      </section>

      {/* Grid z usługami */}
      <section className="section container">
        <div className="services-grid">
          {services.map((srv, idx) => (
            <div key={idx} className="service-card">
              <div className="service-img-wrap">
                {/* Fallback image style with gray background if actual asset is missing */}
                <div style={{ width: "100%", height: "100%", backgroundColor: "#e1e7ec", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", color: "#b0b8c1" }}>
                  {srv.icon}
                </div>
              </div>
              <div className="service-icon">
                {srv.icon}
              </div>
              <div className="service-content">
                <h3>{srv.title}</h3>
                <p>{srv.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action - B2B Info */}
      <section className="section" style={{ backgroundColor: "var(--primary)", color: "white" }}>
        <div className="container text-center">
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Jesteś Instalatorem lub reprezentujesz firmę?</h2>
          <p style={{ maxWidth: "700px", margin: "0 auto 2rem", opacity: 0.9 }}>
            Oferujemy dedykowane, ukryte cenniki oraz wygodny system zapytań ofertowych dla stałych Partnerów biznesowych. 
            Zarejestruj się, poczekaj na weryfikację i zyskaj ekskluzywny dostęp.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <a href="/rejestracja" className="btn" style={{ backgroundColor: "white", color: "var(--primary)" }}>Zarejestruj się w B2B</a>
            <a href="/kontakt" className="btn btn-secondary">Napisz do nas</a>
          </div>
        </div>
      </section>
    </div>
  );
}
