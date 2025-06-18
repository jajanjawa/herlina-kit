# Herlina Kit
protocol untuk menghubungkan DApp Vexanium ke Dompet Herlina

## Fitur
- login cross device
- tanda tangan transaksi
- tanda tangan pesan
- membuat shared secret untuk enkripsi

## Install
```shell
    npm install herlina-kit
```

## Init Herlina
```javascript

const herlina = new Herlina();
herlina.on("session", onSession);
herlina.connect();
```

## Dapatkan WalletSession
```javascript
async function onSession(session, proof) {
   const account = proof.signer.toString(); // ini nama akun
    session.setABICache(abiCache);  // membaca ABI lebih efisien
    session.onClose(onClose);       // dengarkan jika terputus dengan wallet
    // simpan session
    Store.session = session;
}
```

## Membuat Transaksi
```javascript
// kirim VEX dari aiueo ke babibu
const abi = await abiCache.getAbi("vex.token");
const data = {from: "aiueo", to: "babibu", quantity: "1.0000 VEX", memo: "percobaan kirim"};
const action = Action.from({
    account: "vex.token", name: "transfer", data,
    authorization: [Store.session.permissionLevel]
}, abi);
const result = await Store.session.transact({action});
console.log(result.transaction_id); // sudah disiarkan

```