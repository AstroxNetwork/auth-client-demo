import {
  Actor,
  AnonymousIdentity,
  DerEncodedPublicKey,
  HttpAgent,
  Identity,
  Signature,
  SignIdentity,
} from "@dfinity/agent";
// import { blobFromUint8Array, derBlobFromBlob } from '@dfinity/candid';
import { Principal } from "@dfinity/principal";
import { isDelegationValid } from "@dfinity/authentication";
import {
  Delegation,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@dfinity/identity";
import { E8s } from "../utils/common/types";
import { LedgerConnection } from "./ledgerConnection";

const KEY_SESSIONSTORAGE_KEY = "identity";
const KEY_SESSIONSTORAGE_DELEGATION = "delegation";
const KEY_SESSIONSTORAGE_WALLET = "wallet";
const IDENTITY_PROVIDER_DEFAULT = "https://identity.ic0.app";
// const IDENTITY_PROVIDER_DEFAULT = 'http://localhost:8080';
const IDENTITY_PROVIDER_ENDPOINT = "#authorize";

/**
 * List of options for creating an {@link AuthClient}.
 */
export interface AuthClientCreateOptions {
  /**
   * An identity to use as the base
   */
  identity?: SignIdentity;
  /**
   * Optional storage with get, set, and remove. Uses SessionStorage by default
   */
  storage?: AuthClientStorage;
  // appId
  appId?: string;
  idpWindowOption?: string;
}

export interface AuthClientLoginOptions {
  /**
   * Identity provider. By default, use the identity service.
   */
  identityProvider?: string | URL;
  /**
   * Experiation of the authentication
   */
  maxTimeToLive?: bigint;
  /**
   * Callback once login has completed
   */
  onSuccess?: () => void;
  /**
   * Callback in case authentication fails
   */
  onError?: (error?: string) => void;
}

/**
 * Interface for persisting user authentication data
 */
export interface AuthClientStorage {
  get(key: string): Promise<string | null>;

  set(key: string, value: string): Promise<void>;

  remove(key: string): Promise<void>;
}

interface InternetIdentityAuthRequest {
  kind: "authorize-client";
  sessionPublicKey: Uint8Array;
  maxTimeToLive?: bigint;
  appId?: string;
}

// interface InternetIdentityAuthResponseSuccess {
//   kind: "authorize-client-success";
//   delegations: {
//     delegation: {
//       pubkey: Uint8Array;
//       expiration: bigint;
//       targets?: Principal[];
//     };
//     signature: Uint8Array;
//   }[];
//   userPublicKey: Uint8Array;
// }

interface DelegationResult {
  delegations: {
    delegation: {
      pubkey: Uint8Array;
      expiration: bigint;
      targets?: Principal[];
    };
    signature: Uint8Array;
  }[];
  userPublicKey: Uint8Array;
}

interface MeAuthResponseSuccess {
  kind: "authorize-client-success";
  identity: DelegationResult;
  wallet?: string;
}

interface IIAuthResponseSuccess extends DelegationResult {
  kind: "authorize-client-success";
}

type AuthResponseSuccess = MeAuthResponseSuccess | IIAuthResponseSuccess;

async function _deleteStorage(storage: AuthClientStorage) {
  await storage.remove(KEY_SESSIONSTORAGE_KEY);
  await storage.remove(KEY_SESSIONSTORAGE_DELEGATION);
  await storage.remove(KEY_SESSIONSTORAGE_WALLET);
}

export class SessionStorage implements AuthClientStorage {
  constructor(
    public readonly prefix = "ic-",
    private readonly _sessionStorage?: Storage
  ) {}

  public get(key: string): Promise<string | null> {
    return Promise.resolve(
      this._getSessionStorage().getItem(this.prefix + key)
    );
  }

  public set(key: string, value: string): Promise<void> {
    this._getSessionStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }

  public remove(key: string): Promise<void> {
    this._getSessionStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }

  private _getSessionStorage() {
    if (this._sessionStorage) {
      return this._sessionStorage;
    }

    const ls =
      typeof window === "undefined"
        ? typeof global === "undefined"
          ? typeof self === "undefined"
            ? undefined
            : self.sessionStorage
          : global.sessionStorage
        : window.sessionStorage;

    if (!ls) {
      throw new Error("Could not find local storage.");
    }

    return ls;
  }
}

interface AuthReadyMessage {
  kind: "authorize-ready";
}

// interface AuthResponseSuccess {
//   kind: "authorize-client-success";
//   delegations: {
//     delegation: {
//       pubkey: Uint8Array;
//       expiration: bigint;
//       targets?: Principal[];
//     };
//     signature: Uint8Array;
//   }[];
//   userPublicKey: Uint8Array;
// }

interface AuthResponseFailure {
  kind: "authorize-client-failure";
  text: string;
}

type IdentityServiceResponseMessage = AuthReadyMessage | AuthResponse;
type AuthResponse = AuthResponseSuccess | AuthResponseFailure;

export class AuthClient {
  public static async create(
    options: AuthClientCreateOptions = {
      appId: "",
    }
  ): Promise<AuthClient> {
    const storage = options.storage ?? new SessionStorage("ic-");

    let key: null | SignIdentity = null;
    if (options.identity) {
      key = options.identity;
    } else {
      const maybeIdentityStorage = await storage.get(KEY_SESSIONSTORAGE_KEY);
      if (maybeIdentityStorage) {
        try {
          key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
        } catch (e) {
          // Ignore this, this means that the sessionStorage value isn't a valid Ed25519KeyIdentity
          // serialization.
        }
      }
    }

    let identity = new AnonymousIdentity();
    let chain: null | DelegationChain = null;
    let wallet: null | string = null;

    if (key) {
      try {
        const chainStorage = await storage.get(KEY_SESSIONSTORAGE_DELEGATION);
        wallet = await storage.get(KEY_SESSIONSTORAGE_WALLET);

        if (chainStorage) {
          chain = DelegationChain.fromJSON(chainStorage);

          // Verify that the delegation isn't expired.
          if (!isDelegationValid(chain)) {
            await _deleteStorage(storage);
            key = null;
          } else {
            identity = DelegationIdentity.fromDelegation(key, chain);
          }
        }
      } catch (e) {
        console.error(e);
        // If there was a problem loading the chain, delete the key.
        await _deleteStorage(storage);
        key = null;
      }
    }

    return new this(
      identity,
      key,
      chain,
      storage,
      options.appId,
      wallet !== null ? wallet : undefined,
      options.idpWindowOption ??
        "height=600, width=800, top=0, right=0, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no"
    );
  }

  private _delegationIdentity?: DelegationIdentity;

  protected constructor(
    private _identity: Identity,
    private _key: SignIdentity | null,
    private _chain: DelegationChain | null,
    private _storage: AuthClientStorage,
    private _appId?: string,
    private _wallet?: string,
    private _idpWindowOption?: string,
    // A handle on the IdP window.
    private _idpWindow?: Window,
    // The event handler for processing events from the IdP.
    private _eventHandler?: (event: MessageEvent) => void
  ) {}

  private _handleSuccess(message: AuthResponseSuccess, onSuccess?: () => void) {
    if (message["identity"] !== undefined) {
      const idDelegations = (
        message["identity"] as DelegationResult
      ).delegations.map((signedDelegation) => {
        return {
          delegation: new Delegation(
            signedDelegation.delegation.pubkey.buffer,
            signedDelegation.delegation.expiration,
            signedDelegation.delegation.targets
          ),
          signature: signedDelegation.signature.buffer as Signature,
        };
      });

      const idDelegationChain = DelegationChain.fromDelegations(
        idDelegations,
        (message["identity"] as DelegationResult).userPublicKey
          .buffer as DerEncodedPublicKey
      );
      this._chain = idDelegationChain;
      this._wallet = message["wallet"];
    } else {
      const iiDelegations = (message as DelegationResult).delegations.map(
        (signedDelegation) => {
          return {
            delegation: new Delegation(
              signedDelegation.delegation.pubkey.buffer,
              signedDelegation.delegation.expiration,
              signedDelegation.delegation.targets
            ),
            signature: signedDelegation.signature.buffer as Signature,
          };
        }
      );

      const iiDelegationChain = DelegationChain.fromDelegations(
        iiDelegations,
        (message as DelegationResult).userPublicKey
          .buffer as DerEncodedPublicKey
      );
      this._chain = iiDelegationChain;
    }

    const key = this._key;
    if (!key) {
      return;
    }
    this._delegationIdentity = DelegationIdentity.fromDelegation(
      key,
      this._chain!
    );
    this._identity = this._delegationIdentity;
    console.log(this._identity);

    this._idpWindow?.close();
    onSuccess?.();
    this._removeEventListener();
  }

  public getIdentity(): Identity {
    return this._identity;
  }

  public getDelegationIdentity(): DelegationIdentity | undefined {
    return this._delegationIdentity;
  }

  public getInnerKey(): SignIdentity | null {
    return this._key;
  }

  public get wallet(): string | undefined {
    return this._wallet;
  }

  public setWallet(data: string) {
    this._wallet = data;
  }

  public async isAuthenticated(): Promise<boolean> {
    return (
      !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null
    );
  }

  public async login(options?: AuthClientLoginOptions): Promise<void> {
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      await this._storage.set(KEY_SESSIONSTORAGE_KEY, JSON.stringify(key));
    }

    // Create the URL of the IDP. (e.g. https://XXXX/#authorize)
    const identityProviderUrl = new URL(
      options?.identityProvider?.toString() || IDENTITY_PROVIDER_DEFAULT
    );
    // Set the correct hash if it isn't already set.
    identityProviderUrl.hash = IDENTITY_PROVIDER_ENDPOINT;

    // If `login` has been called previously, then close/remove any previous windows
    // and event listeners.
    this._idpWindow?.close();
    this._removeEventListener();

    // Add an event listener to handle responses.
    this._eventHandler = this._getEventHandler(identityProviderUrl, options);
    window.addEventListener("message", this._eventHandler);

    console.log(this._idpWindowOption);
    // Open a new window with the IDP provider.
    this._idpWindow =
      window.open(
        identityProviderUrl.toString(),
        "idpWindow",
        this._idpWindowOption
      ) ?? undefined;
  }

  private _getEventHandler(
    identityProviderUrl: URL,
    options?: AuthClientLoginOptions
  ) {
    return async (event: MessageEvent) => {
      if (event.origin !== identityProviderUrl.origin) {
        return;
      }

      const message = event.data as IdentityServiceResponseMessage;

      switch (message.kind) {
        case "authorize-ready": {
          // IDP is ready. Send a message to request authorization.
          const request: InternetIdentityAuthRequest = {
            kind: "authorize-client",
            sessionPublicKey: new Uint8Array(
              this._key?.getPublicKey().toDer()!
            ),
            maxTimeToLive: options?.maxTimeToLive,
            appId: this._appId,
          };
          this._idpWindow?.postMessage(request, identityProviderUrl.origin);
          break;
        }
        case "authorize-client-success":
          // Create the delegation chain and store it.
          try {
            this._handleSuccess(message, options?.onSuccess);

            // Setting the storage is moved out of _handleSuccess to make
            // it a sync function. Having _handleSuccess as an async function
            // messes up the jest tests for some reason.
            if (this._chain) {
              await this._storage.set(
                KEY_SESSIONSTORAGE_DELEGATION,
                JSON.stringify(this._chain.toJSON())
              );
            }
            if (this._wallet !== undefined) {
              await this._storage.set(KEY_SESSIONSTORAGE_WALLET, this._wallet);
            }
          } catch (err) {
            this._handleFailure((err as Error).message, options?.onError);
          }
          break;
        case "authorize-client-failure":
          this._handleFailure(message.text, options?.onError);
          break;
        default:
          break;
      }
    };
  }

  private _handleFailure(
    errorMessage?: string,
    onError?: (error?: string) => void
  ): void {
    this._idpWindow?.close();
    onError?.(errorMessage);
    this._removeEventListener();
  }

  private _removeEventListener() {
    if (this._eventHandler) {
      window.removeEventListener("message", this._eventHandler);
    }
    this._eventHandler = undefined;
  }

  public async logout(options: { returnTo?: string } = {}): Promise<void> {
    _deleteStorage(this._storage);

    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._key = null;
    this._chain = null;
    this._wallet = undefined;

    if (options.returnTo) {
      try {
        window.history.pushState({}, "", options.returnTo);
      } catch (e) {
        window.location.href = options.returnTo;
      }
    }
  }
}
declare global {
  interface Window {
    ic: IC & any;
  }
}

export interface ConnectOptions extends AuthClientCreateOptions {}

const days = BigInt(1);
const hours = BigInt(24);
const nanoseconds = BigInt(3600000000000);

export class IC {
  public static async connect(
    connectOptions: ConnectOptions,
    loginOptions?: AuthClientLoginOptions
  ): Promise<IC> {
    const authClient = await AuthClient.create(connectOptions);

    const ic = new this(authClient);

    const provider =
      loginOptions?.identityProvider ?? process.env.isProduction
        ? "https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app/#authorize" // 'https://identity.ic0.app/#authorize'
        : process.env.LOCAL_ME_CANISTER;

    console.log({ provider });

    await ic.getAuthClient().login({
      onSuccess: async () => {
        ic.handleAuthenticated(ic);
      },
      identityProvider: provider,
      // Maximum authorization expiration is 8 days
      maxTimeToLive: loginOptions?.maxTimeToLive ?? days * hours * nanoseconds,
      onError: ic.handleError,
    });

    return ic;
  }
  #authClient: AuthClient;
  #agent?: HttpAgent;
  #ledger?: LedgerConnection;
  protected constructor(authClient: AuthClient) {
    this.#authClient = authClient;
  }

  public get identity(): Identity {
    return this.#authClient.getIdentity();
  }

  public get principal(): Principal {
    return this.identity.getPrincipal();
  }

  public get wallet(): string | undefined {
    return this.#authClient.wallet;
  }

  protected getAuthClient(): AuthClient {
    return this.#authClient;
  }

  public async queryBalance(): Promise<bigint> {
    if (this.wallet === undefined) {
      throw Error("Wallet address is not found");
    }
    if (this.#ledger === undefined) {
      throw Error("Ledger connection faild");
    }
    const result = await this.#ledger?.getBalance(this.wallet!);
    return result;
  }

  public async handleAuthenticated(ic: IC) {
    const identity = ic.getAuthClient().getIdentity();

    this.#agent = new HttpAgent({ identity });

    if (!process.env.isProduction) {
      await this.#agent.fetchRootKey();
    }
    this.#ledger = LedgerConnection.createConnection(
      ic.getAuthClient().getInnerKey()!,
      ic.getAuthClient().getDelegationIdentity()!
    );
    if (window.ic !== undefined) {
      let plug;
      if (window.ic.plug !== undefined) {
        plug = window.ic.plug;
      }
      window.ic = ic;
      window.ic.plug = plug;
    } else {
      window.ic = ic;
    }
  }

  public handleError(error?: string): void {
    throw new Error(error);
  }
}
