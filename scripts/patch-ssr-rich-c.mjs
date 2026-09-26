import fs from 'node:fs';
const out='server/ssrListPages.ts';
if(fs.existsSync(out) && fs.readFileSync(out,'utf8').includes('tryRichListSeo')){
  console.log('[ssr-rich-c] exists');
} else {
  const bufs=[];
  for(let i=0;i<3;i++){
    const p=fs.readFileSync('scripts/ssr-list-p'+i+'.b64','utf8').trim();
    bufs.push(Buffer.from(p,'base64'));
  }
  fs.writeFileSync(out, Buffer.concat(bufs));
  console.log('[ssr-rich-c] wrote', out, fs.statSync(out).size);
}
