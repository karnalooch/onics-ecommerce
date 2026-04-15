// src/store/serverStore.ts
// Współdzielony globalny stan serwerowy dla środowiska izolowanego (Node.js/Next.js)

export function initializeMockData() {
  if (!(global as any).mockUsersStore) {
    (global as any).mockUsersStore = [
      { id: "1", email: "admin@celtronics.pl", username: "Admin", companyName: "SuperAdmin CELTRONICS", roleType: "ADMIN", isApproved: true, isBlocked: false, nip: null, jwt: "mock-jwt-admin", address: "ul. Główna 1, Siedlce", phone: "+48 111 222 333", createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: "2", email: "instalator@celtronics.pl", username: "Ewa B2B", companyName: "Tech-Mont Ewa Kowalska", roleType: "BIZ", isApproved: true, isBlocked: false, nip: "1234567890", jwt: "mock-jwt-biz", address: "ul. Instalatorska 44, Warszawa", phone: "+48 999 888 777", createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
      { id: "3", email: "detal@celtronics.pl", username: "Janusz Detal", companyName: "", roleType: "RETAIL", isApproved: true, isBlocked: false, nip: null, jwt: "mock-jwt-retail", address: "ul. Kwiatowa 2, Lublin", phone: "+48 444 555 666", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "4", email: "nowy@przyklad.pl", username: "Konrad", companyName: "Januszex Sp. z o.o.", roleType: "BIZ", isApproved: false, isBlocked: false, nip: "0987654321", jwt: "mock-jwt-new", address: "ul. Zamkowa 1, Kraków", phone: "+48 333 222 111", createdAt: new Date().toISOString() }
    ];
  }

  if (!(global as any).mockOrdersStore) {
    (global as any).mockOrdersStore = [];
  }

  if (!(global as any).mockRepairsStore) {
    (global as any).mockRepairsStore = [
      { id: "RMA-001", clientEmail: "instalator@celtronics.pl", device: "Kamera IP CAM-1", description: "Brak zasilania po burzy", status: "PENDING", createdAt: new Date().toISOString() },
      { id: "RMA-002", clientEmail: "detal@celtronics.pl", device: "Rejestrator 4CH", description: "Nie czyta dysku twardego", status: "IN_PROGRESS", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() }
    ];
  }

  if (!(global as any).mockCategoriesStore) {
    (global as any).mockCategoriesStore = [
      { id: "c1", name: "TV-SAT", subcategories: ["Anteny TV FM DAB", "Anteny SAT", "Konwertery SAT", "Multiswitche", "Wzmacniacze", "Tunery", "Modulatory"] },
      { id: "c2", name: "TELEFONIA KOMÓRKOWA", subcategories: ["Anteny", "Wzmacniacze Gsm"] },
      { id: "c3", name: "MONITORING", subcategories: ["Kamery IP", "Kamery Analogowe", "Rejestratory NVR", "Rejestratory DVR", "Zasilacze", "Kable"] },
      { id: "c4", name: "WLAN, LAN", subcategories: ["Switche", "Routery", "Access Pointy", "Kable UTP"] },
      { id: "c5", name: "INSTALACJE ŚWIATŁOWODOWE", subcategories: ["Patchcordy", "Pigtajle", "Spawarki"] },
      { id: "c6", name: "WIDEODOMOFONY SMART HOME", subcategories: ["Stacje bramowe", "Monitory wewnętrzne", "Elementy wykonawcze"] },
      { id: "c7", name: "ALARMY", subcategories: ["Centrale", "Czujki", "Sygnalizatory", "Klawiatury"] }
    ];
  }

  if (!(global as any).mockProductsStore) {
    (global as any).mockProductsStore = [
      { id: "p1", sku: "SAT-A1", name: "Antena Satelitarna Corab 80cm", categoryId: "c1", manufacturer: "Corab", price: 125.00, stock: 45, seoDescription: "<p>Solidna czasza aluminiowa polecana przez instalatorów.</p>" },
      { id: "p2", sku: "MON-IP-001", name: "Kamera Kopułkowa IP 4MP", categoryId: "c3", manufacturer: "Hikvision", price: 290.00, stock: 120, seoDescription: "<p>Kamera z trybem Darkfighter i WDR.</p>" },
      { id: "p3", sku: "ALR-CTR-1", name: "Płyta Główna INTEGRA 32", categoryId: "c7", manufacturer: "Satel", price: 410.00, stock: 12, seoDescription: "" },
      { id: "p4", sku: "LAN-SW-8", name: "Switch PoE 8-portowy", categoryId: "c4", manufacturer: "Dahua", price: 195.00, stock: 30, seoDescription: "<ul><li>Moc budżetowa 60W</li></ul>" }
    ];
  }

  return {
    users: (global as any).mockUsersStore,
    orders: (global as any).mockOrdersStore,
    repairs: (global as any).mockRepairsStore,
    categories: (global as any).mockCategoriesStore,
    products: (global as any).mockProductsStore
  };
}
