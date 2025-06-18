import {SigningRequest} from "@wharfkit/signing-request";
import {
    Action,
    Checksum512,
    Name,
    PermissionLevel,
    PublicKey,
    Signature,
    SignedTransaction,
    Transaction
} from "@wharfkit/antelope";
import {ABICache} from "@wharfkit/abicache";
import zlib from "pako";

export class WalletSession {
    static ChainID = "f9f432b1851b5c179d2091a96f593aaed50ec7466b74f89301f957a83e56ce1f";

    #connection;
    #callbacks;
    #encodingOptions;
    /**
     * @type {PermissionLevel}
     */
    #permissionLevel;
    #closeListener;
    #errorListener;


    constructor(connection) {
        this.#connection = connection;
        this.#callbacks = new Map();
        connection.on('data', this.#onDataReceived.bind(this));
        connection.on('close', () => {
            if (this.#closeListener) this.#closeListener();
        });
        connection.on('error', (error) => {
            if (this.#errorListener) this.#errorListener(error);
        });
    }

    /**
     *
     * @param {ABICache} cache
     */
    setABICache(cache) {
        this.#encodingOptions = {zlib, abiProvider: cache};
    }

    /**
     * listener dipanggil ketika terputus dengan wallet
     * @param listener
     */
    onClose(listener) {
        this.#closeListener = listener;
    }

    onError(listener) {
        this.#errorListener = listener;
    }

    /**
     * apakah masih tersambung dengan wallet
     * @return {boolean}
     */
    isOpen() {
        return this.#connection.open;
    }

    /**
     * putuskan sambungan dengan wallet
     */
    close() {
        this.#connection.close();
    }

    /**
     * @return {PermissionLevel}
     */
    get permissionLevel() {
        return this.#permissionLevel;
    }

    set permissionLevel(value) {
        this.#permissionLevel = value;
    }

    /**
     * @return {Name}
     */
    get actor() {
        return this.#permissionLevel.actor;
    }

    /**
     * @return {Name}
     */
    get permission() {
        return this.#permissionLevel.permission;
    }


    /**
     * @typedef TransactArguments
     * @property {Action} action transaksi dengan 1 action
     * @property {Action[]} actions transaksi dengan lebih dari 1 action
     * @property {Transaction} transaction transaksi
     */

    /**
     * @typedef TransactOptions
     * @property {boolean} broadcast transaksi disiarkan ke blockchain atau hanya tanda tangan
     */
    /**
     * membuat transaksi
     * @param {TransactArguments} args
     * @param {TransactOptions?} options
     * @return {Promise<SignedTransaction|SendTransactionResponse>}
     */
    async transact(args, options) {
        args.chainId = WalletSession.ChainID;
        const willBroadcast = options && typeof options.broadcast !== 'undefined' ? options.broadcast : true;

        const request = await SigningRequest.create(args, this.#encodingOptions);
        request.setBroadcast(willBroadcast);

        const vsr = request.encode(true, false, "vsr:");
        return this.signingRequest(vsr);
    }


    /**
     * kirim vsr ke wallet.
     * siarkan transaksi ke blockchain secara langsung atau
     * hanya tanda tangan saja kemudian aplikasi yang siarkan
     * @param {string} vsr
     * @return {Promise<SendTransactionResponse|SignedTransaction>}
     */
    signingRequest(vsr) {
        const callback = window.crypto.randomUUID();
        const data = {
            method: "signingRequest", id: callback, params: {vsr: vsr}
        };
        return new Promise((resolve, reject) => {
            const func = reply => {
                if (reply.code === 201) {
                    resolve(reply.params.result);
                } else if (reply.code === 200) {
                    resolve(SignedTransaction.from(reply.params.result));
                } else {
                    if (typeof reply.params.error === "string") {
                        reject(new Error(reply.params.error));
                    } else {
                        reject(reply.params.error);
                    }
                }
            };
            this.#callbacks.set(callback, func);
            this.#connection.send(data);
        });
    }

    /**
     * minta tanda tangan
     * @param {string} message pesan yang ditanda tangani
     * @return {Promise<Signature>}
     */
    signMessage(message) {
        const callback = window.crypto.randomUUID();
        const data = {
            method: "signMessage", id: callback, params: {message}
        };
        return new Promise((resolve, reject) => {
            const func = reply => {
                if (reply.code === 201) {
                    resolve(Signature.from(reply.params.signature));
                } else {
                    reject(new Error(reply.params.error));
                }
            };
            this.#callbacks.set(callback, func);
            this.#connection.send(data);
        });
    }

    /**
     * membuat shared secret
     * @param {PublicKey} publicKey
     * @return {Promise<Checksum512>}
     */
    sharedSecret(publicKey) {
        const callback = window.crypto.randomUUID();
        const data = {
            method: "sharedSecret", id: callback, params: {key: publicKey.toString()}
        };
        return new Promise((resolve, reject) => {
            const func = reply => {
                if (reply.code === 201) {
                    resolve(Checksum512.from(reply.params.secret));
                } else {
                    reject(new Error(reply.params.error));
                }
            };
            this.#callbacks.set(callback, func);
            this.#connection.send(data);
        });
    }

    /**
     * data diterima dari wallet
     * @param {Object} data
     */
    #onDataReceived(data) {
        let callback = this.#callbacks.get(data.id);
        if (callback) {
            callback(data);
            this.#callbacks.delete(data.id);
        }
    }

}