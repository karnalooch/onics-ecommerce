// src/store/serverStore.ts
// Współdzielony globalny stan serwerowy dla środowiska izolowanego (Node.js/Next.js)

export function initializeMockData() {
  if (!(global as any).mockUsersStore) {
    (global as any).mockUsersStore = [
      { id: "1", email: "admin@celtronics.pl", username: "Admin", companyName: "Administrator Systemu", roleType: "ADMIN", isApproved: true, isBlocked: false, nip: null, jwt: "mock-jwt-admin", address: "ul. Główna 1, Siedlce", phone: "+48 111 222 333", createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: "2", email: "instalator@celtronics.pl", username: "Instalator", companyName: "Instalator B2B (Tier A)", roleType: "BIZ", isApproved: true, isBlocked: false, nip: "1234567890", jwt: "mock-jwt-biz", address: "ul. Instalatorska 44, Warszawa", phone: "+48 999 888 777", createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
      { id: "3", email: "detal@celtronics.pl", username: "Detal", companyName: "Klient Detaliczny", roleType: "RETAIL", isApproved: true, isBlocked: false, nip: null, jwt: "mock-jwt-retail", address: "ul. Kwiatowa 2, Lublin", phone: "+48 444 555 666", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "4", email: "nowy@przyklad.pl", username: "Konrad", companyName: "Januszex Sp. z o.o.", roleType: "BIZ", isApproved: false, isBlocked: false, nip: "0987654321", jwt: "mock-jwt-new", address: "ul. Zamkowa 1, Kraków", phone: "+48 333 222 111", createdAt: new Date().toISOString() }
    ];
  }

  if (!(global as any).mockCategoriesStore) {
    (global as any).mockCategoriesStore = [
      { id: "c1", name: "TV-SAT", iconName: "Tv", subcategories: [{ id: "s1", name: "Anteny TV FM DAB" }, { id: "s2", name: "Anteny SAT" }, { id: "s3", name: "Konwertery SAT" }, { id: "s4", name: "Multiswitche" }] },
      { id: "c2", name: "TELEFONIA KOMÓRKOWA", iconName: "Smartphone", subcategories: [{ id: "s5", name: "Anteny GSM" }, { id: "s6", name: "Wzmacniacze Gsm" }] },
      { id: "c3", name: "MONITORING", iconName: "Video", subcategories: [{ id: "s7", name: "Kamery IP" }, { id: "s8", name: "Kamery Analogowe" }, { id: "s9", name: "Rejestratory NVR" }] },
      { id: "c4", name: "WLAN, LAN", iconName: "Network", subcategories: [{ id: "s10", name: "Switche" }, { id: "s11", name: "Routery" }] },
      { id: "c7", name: "ALARMY", iconName: "Shield", subcategories: [{ id: "s12", name: "Centrale" }, { id: "s13", name: "Czujki" }] }
    ];
  }

  if (!(global as any).mockProductsStore || (global as any).mockProductsStore.length < 20) {
    (global as any).mockProductsStore = [
      { id: "p1", sku: "SAT-A1", name: "Antena Satelitarna Corab 80cm", categoryId: "c1", subcategoryId: "s2", manufacturer: "Corab", price: 125.00, stock: 45, seoDescription: "<p>Solidna czasza aluminiowa polecana przez instalatorów.</p>" },
      { id: "p2", sku: "MON-IP-001", name: "Kamera Kopułkowa IP 4MP", categoryId: "c3", subcategoryId: "s7", manufacturer: "Hikvision", price: 290.00, stock: 120, seoDescription: "<p>Kamera z trybem Darkfighter i WDR.</p>" },
      { id: "p3", sku: "ALR-CTR-1", name: "Płyta Główna INTEGRA 32", categoryId: "c7", subcategoryId: "s12", manufacturer: "Satel", price: 410.00, stock: 12, seoDescription: "" },
      { id: "p4", sku: "LAN-SW-8", name: "Switch PoE 8-portowy", categoryId: "c4", subcategoryId: "s10", manufacturer: "Dahua", price: 195.00, stock: 30, seoDescription: "<ul><li>Moc budżetowa 60W</li></ul>" },
      { id: "p5", sku: "SAT-K1", name: "Konwerter Quad Sharp", categoryId: "c1", subcategoryId: "s3", manufacturer: "Sharp", price: 85.00, stock: 20, seoDescription: "" },
      { id: "p6", sku: "SAT-M1", name: "Multiswitch 5/8 Opticum", categoryId: "c1", subcategoryId: "s4", manufacturer: "Opticum", price: 140.00, stock: 8, seoDescription: "" },
      { id: "p7", sku: "GSM-A1", name: "Antena ATK-10/800-980 MHz", categoryId: "c2", subcategoryId: "s5", manufacturer: "Diplol", price: 110.00, stock: 15, seoDescription: "" },
      { id: "p8", sku: "MON-IP-002", name: "Kamera DS-2CD2143G2-I", categoryId: "c3", subcategoryId: "s7", manufacturer: "Hikvision", price: 345.00, stock: 25, seoDescription: "" },
      { id: "p9", sku: "MON-AN-001", name: "Kamera Analogowa HD-TVI 2MP", categoryId: "c3", subcategoryId: "s8", manufacturer: "Hikvision", price: 115.00, stock: 50, seoDescription: "" },
      { id: "p10", sku: "MON-REC-001", name: "Rejestrator 8CH NVR Dahua", categoryId: "c3", subcategoryId: "s9", manufacturer: "Dahua", price: 420.00, stock: 10, seoDescription: "" },
      { id: "p11", sku: "LAN-RT-001", name: "Router MikroTik RB4011", categoryId: "c4", subcategoryId: "s11", manufacturer: "MikroTik", price: 750.00, stock: 5, seoDescription: "" },
      { id: "p12", sku: "ALR-CZ-001", name: "Czujka RUCHU SLIM-PIR", categoryId: "c7", subcategoryId: "s13", manufacturer: "Satel", price: 55.00, stock: 100, seoDescription: "" },
      { id: "p13", sku: "SAT-A2", name: "Antena 90cm Famaval", categoryId: "c1", subcategoryId: "s2", manufacturer: "Famaval", price: 160.00, stock: 12, seoDescription: "" },
      { id: "p14", sku: "MON-IP-003", name: "Kamera IP 8MP 4K", categoryId: "c3", subcategoryId: "s7", manufacturer: "Dahua", price: 580.00, stock: 18, seoDescription: "" },
      { id: "p15", sku: "LAN-SW-16", name: "Switch 16x 10/100/1000", categoryId: "c4", subcategoryId: "s10", manufacturer: "TP-Link", price: 230.00, stock: 7, seoDescription: "" },
      { id: "p16", sku: "ALR-CTR-2", name: "Centrala PERFECTA 16", categoryId: "c7", subcategoryId: "s12", manufacturer: "Satel", price: 320.00, stock: 14, seoDescription: "" },
      { id: "p17", sku: "SAT-K2", name: "Konwerter Twin Inverto", categoryId: "c1", subcategoryId: "s3", manufacturer: "Inverto", price: 65.00, stock: 30, seoDescription: "" },
      { id: "p18", sku: "GSM-W1", name: "Wzmacniacz GSM Turbo-Room", categoryId: "c2", subcategoryId: "s6", manufacturer: "Signal", price: 890.00, stock: 3, seoDescription: "" },
      { id: "p19", sku: "MON-IP-004", name: "Kamera WiFi Tuya Smart", categoryId: "c3", subcategoryId: "s7", manufacturer: "Inny", price: 145.00, stock: 40, seoDescription: "" },
      { id: "p20", sku: "ALR-CZ-002", name: "Czujka Zalania WL-2", categoryId: "c7", subcategoryId: "s13", manufacturer: "Satel", price: 82.00, stock: 22, seoDescription: "" },
      { id: "p21", sku: "LAN-RT-002", name: "Router ASUS RT-AX58U", categoryId: "c4", subcategoryId: "s11", manufacturer: "Asus", price: 440.00, stock: 6, seoDescription: "" },
      { id: "p22", sku: "SAT-M2", name: "Multiswitch 9/16 Terra", categoryId: "c1", subcategoryId: "s4", manufacturer: "Terra", price: 520.00, stock: 4, seoDescription: "" },
      { id: "p23", sku: "MON-REC-002", name: "NVR 16CH Hikvision 7616", categoryId: "c3", subcategoryId: "s9", manufacturer: "Hikvision", price: 980.00, stock: 2, seoDescription: "" },
      { id: "p24", sku: "ALR-CZ-003", name: "Czujka Magnetyczna B-3", categoryId: "c7", subcategoryId: "s13", manufacturer: "Satel", price: 12.00, stock: 250, seoDescription: "" },
      { id: "p25", sku: "SAT-A3", name: "Antena Tri Digit UHF", categoryId: "c1", subcategoryId: "s1", manufacturer: "Diplol", price: 135.00, stock: 20, seoDescription: "" }
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

  return {
    users: (global as any).mockUsersStore,
    orders: (global as any).mockOrdersStore,
    repairs: (global as any).mockRepairsStore,
    categories: (global as any).mockCategoriesStore,
    products: (global as any).mockProductsStore
  };
}
