export default function KontaktPage() {
  return (
    <div className="inner-page">
      <section className="contact section" style={{ minHeight: "calc(100vh - 90px)" }}>
        <div className="container contact-wrapper">
          {/* Informacje Kontaktowe */}
          <div style={{ zIndex: 2, position: "relative" }}>
            <span className="section-tag" style={{ color: "var(--accent-orange)" }}>Skontaktuj Się</span>
            <h1 className="section-title" style={{ color: "white" }}>Zostańmy w kontakcie</h1>
            <div className="title-underline light"></div>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.1rem", marginBottom: "30px" }}>
              Masz pytania dotyczące oferty, naszej platformy B2B, czy może potrzebujesz pomocy w procesie rejestracji? Jesteśmy do Twojej dyspozycji.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <div className="icon-circle">📍</div>
                <div>
                  <h4>Główna Siedziba</h4>
                  <p>ul. Instalacyjna 42<br />00-001 Warszawa</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="icon-circle">📞</div>
                <div>
                  <h4>Telefon Infolinii</h4>
                  <p>+48 123 456 789<br />+48 987 654 321</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="icon-circle">✉️</div>
                <div>
                  <h4>Adres E-mail</h4>
                  <p>biuro@celtronics.pl<br />b2b@celtronics.pl</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formularz Kontaktowy */}
          <div className="contact-form-wrap" style={{ position: "relative", zIndex: 2 }}>
            <div className="contact-form">
              <h3>Wyślij Wiadomość</h3>
              <form>
                <div className="form-group">
                  <input type="text" placeholder="Twoje Imię i Nazwisko / Firma" required />
                </div>
                <div className="form-group">
                  <input type="email" placeholder="Twój adres E-mail" required />
                </div>
                <div className="form-group">
                  <input type="text" placeholder="Temat Wiadomości" required />
                </div>
                <div className="form-group">
                  <textarea rows={5} placeholder="Treść wiadomości..." required></textarea>
                </div>
                <button type="submit" className="btn btn-primary full-width">Wyślij Wiadomość</button>
              </form>
              <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>
                Jeśli interesuje Cię cennik hurtowy, prosimy o założenie konta w <a href="/rejestracja" style={{ color: "var(--primary)", fontWeight: "bold" }}>Platformie B2B</a>.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
