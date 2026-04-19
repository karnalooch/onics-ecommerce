import * as fs from 'fs';
import * as path from 'path';

async function downloadEmu() {
  const url = 'https://www.distributor-catalog.pl/files/cenniki/emu/Cennik%20EMU.pdf';
  const dest = 'public/uploads/catalogs/universal_live/Cennik EMU.pdf';
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buf));
  console.log('EMU REDOWNLOADED SUCCESSFULLY');
}

downloadEmu().catch(console.error);
