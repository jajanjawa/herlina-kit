import {Base64u, IdentityProof, SigningRequest} from "@wharfkit/signing-request";
import {Serializer} from "@wharfkit/antelope";
import {Peer} from "peerjs";
import zlib from "pako";
import {WalletSession} from "./WalletSession.js";

/**
 * Membuat sambungan dengan signal server.
 * Dapatkan WalletSession
 */
export class Herlina {
    #peer;
    #peerOptions = {};
    #appID;
    #listeners = new Map();

    constructor() {
        this.#appID = `VEX-${window.crypto.randomUUID()}`;
    }

    /**
     * setel alamat signal server
     * @param host
     * @param port
     */
    setServer(host, port) {
        this.#peerOptions.host = host;
        if (port) this.#peerOptions.port = port;
    }

    /**
     * Setel listeners untuk peer events
     * @param {string} event open, close, disconnected, error, session
     * @param {Function} func
     */
    on(event, func) {
        this.#listeners.set(event, func);
    }

    /**
     * buat sambungan dengan signal server.
     * jawaban dari wallet bisa didengarkan dengan event session
     *
     * @see on
     */
    connect() {
        this.#peer = new Peer(this.#appID, this.#peerOptions);
        this.#peer.on("connection", this.#onConnection.bind(this));
        this.#listeners.forEach((func, key) => {
            this.#peer.on(key, func);
        });
    }

    disconnect() {
        this.#peer.disconnect();
    }

    destroy() {
        this.#peer.destroy();
    }

    reconnect() {
        this.#peer.reconnect();
    }

    isDisconnected() {
        return this.#peer.disconnected;
    }

    isDestroyed() {
        return this.#peer.destroyed;
    }

    /**
     * membuat vsr untuk login.
     * @param {string} name nama aplikasi
     * @param {string} icon url icon aplikasi
     * @return {string} vsr yang bisa dipakai untuk data kode qr atau query url
     */
    createLoginRequest(name, icon) {
        let req = SigningRequest.identity({scope: "vexanium", chainId: WalletSession.ChainID}, {zlib});
        req.setInfoKey("pi", this.#appID);
        req.setInfoKey("na", name);
        req.setInfoKey("ic", icon);
        req.setInfoKey("do", window.location.origin);
        return req.encode(true, false, "vsr:");
    }

    /**
     *
     * @param {DataConnection} conn
     */
    #onConnection(conn) {
        conn.once("data", data => {
            if (data.code === 101 && data.auth) {
                const auth = Base64u.decode(data.auth);
                const proof = Serializer.decode({data: auth, type: IdentityProof});
                const session = new WalletSession(conn);
                session.permissionLevel = proof.signer;

                const func = this.#listeners.get("session");
                if (func) func(session, proof);
            }
        });

    }
}