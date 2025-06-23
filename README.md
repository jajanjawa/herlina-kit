# Herlina Kit
protocol untuk menghubungkan DApp Vexanium ke Dompet Herlina

## Fitur
- login cross device
- tanda tangan transaksi
- tanda tangan pesan
- membuat shared secret untuk enkripsi


## Init Herlina
```javascript

const herlina = new Herlina();
herlina.on("session", onSession);
herlina.connect();
```

## Membuat Login Request dan Buka wallet 
```javascript
    const vsr = herlina.createLoginRequest("DApp Vexanium 101", "url icon aplikasi");
    const request = vsr.split(":")[1];
    const walletUrl = `https://herlina.web.app/login?vsr=${request}`;
    window.open(walletUrl, "Wallet Vexanium");
    
```

## Dapatkan WalletSession
```javascript
function onSession(session, proof) {
   const account = proof.signer.toString(); // perlu verifikasi
    session.setABICache(abiCache);  // membaca ABI lebih efisien
    session.onClose(onClose);       // dengarkan jika terputus dengan wallet
    // simpan session
    Store.session = session;
}
```

## Membuat Transaksi
```javascript
// kirim VEX
const abi = await abiCache.getAbi("vex.token");
const data = {from: "aiueo", to: "babibu", quantity: "1.0000 VEX", memo: "percobaan kirim"};
const action = Action.from({
    account: "vex.token", name: "transfer", data,
    authorization: [Store.session.permissionLevel]
}, abi);
const result = await Store.session.transact({action});
console.log(result.transaction_id);

```