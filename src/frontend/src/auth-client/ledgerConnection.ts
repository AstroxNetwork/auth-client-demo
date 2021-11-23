/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Principal } from "@dfinity/principal";
import {
  BaseConnection,
  CreateActorResult,
  executeWithLogging,
  _createActor,
} from "./baseConnection";
import ledger_idl from "./ledger.idl";
import LEDGER_SERVICE, {
  AccountIdentifier,
  BlockHeight,
  ICPTs,
  Memo,
  SubAccount,
  TimeStamp,
} from "./ledger";
import { ActorSubclass, HttpAgent, SignIdentity } from "@dfinity/agent";
import { DelegationIdentity } from "@dfinity/identity";
import { fromSubAccountId } from "../utils/converter";

const canisterId: string = process.env.LEDGER_CANISTER_ID!;
export const canisterIdPrincipal: Principal = Principal.fromText(canisterId);

interface SendOpts {
  fee?: bigint;
  memo?: Memo;
  from_subaccount?: number;
  created_at_time?: Date;
}

export class LedgerConnection extends BaseConnection<LEDGER_SERVICE> {
  protected constructor(
    public identity: SignIdentity,
    public delegationIdentity: DelegationIdentity,
    public actor?: ActorSubclass<LEDGER_SERVICE>,
    public agent?: HttpAgent
  ) {
    super(identity, delegationIdentity, canisterId, ledger_idl, actor, agent);
  }

  /**
   * create connection
   * @function createConnection
   * @return {LedgerConnection}
   */
  static createConnection(
    identity: SignIdentity,
    delegationIdentity: DelegationIdentity,
    actor?: ActorSubclass<LEDGER_SERVICE>,
    agent?: HttpAgent
  ): LedgerConnection {
    return new LedgerConnection(identity, delegationIdentity, actor, agent);
  }

  /**
   * create Actor with DelegationIdentity
   * @function {function name}
   * @return {type} {description}
   */
  static async createActor(
    delegationIdentity: DelegationIdentity
  ): Promise<CreateActorResult<LEDGER_SERVICE>> {
    const actor = await _createActor<LEDGER_SERVICE>(
      ledger_idl,
      canisterId,
      delegationIdentity
    );
    return actor;
  }

  static async createConnectionWithII(
    identity: SignIdentity,
    delegationIdentity: DelegationIdentity
  ): Promise<LedgerConnection> {
    const actorResult = await LedgerConnection.createActor(delegationIdentity);
    return LedgerConnection.createConnection(
      identity,
      delegationIdentity,
      actorResult.actor,
      actorResult.agent
    );
  }

  /**
   * get NNS Actor, used internally
   * @function {function name}
   * @return {type} {description}
   */
  async getLedgerActor(): Promise<ActorSubclass<LEDGER_SERVICE>> {
    const actor = await this._getActor(canisterId, ledger_idl);
    return actor;
  }

  async getBalance(account: AccountIdentifier): Promise<bigint> {
    const actor = await this.getLedgerActor();
    const response = await executeWithLogging(() =>
      actor.account_balance_dfx({ account })
    );
    return response.e8s;
  }

  async send({
    to,
    amount,
    sendOpts,
  }: {
    to: AccountIdentifier;
    amount: bigint;
    sendOpts: SendOpts;
  }): Promise<BlockHeight> {
    const actor = await this.getLedgerActor();
    const response = await executeWithLogging(() => {
      const defaultFee = BigInt(10000);
      const defaultMemo = BigInt(Math.floor(Math.random() * 10000));
      const subAccount =
        sendOpts?.from_subaccount === undefined
          ? ([] as [])
          : (Array.from<SubAccount>([
              fromSubAccountId(sendOpts?.from_subaccount),
            ]) as [SubAccount]);

      const createAtTime =
        sendOpts?.created_at_time === undefined
          ? ([] as [])
          : (Array.from<TimeStamp>([
              {
                timestamp_nanos: BigInt(sendOpts?.created_at_time?.getTime()),
              },
            ]) as [TimeStamp]);

      const sendArgs = {
        to: to,
        fee: {
          e8s: sendOpts?.fee ?? defaultFee,
        },
        amount: { e8s: amount },
        memo: sendOpts?.memo ?? defaultMemo,
        from_subaccount: subAccount,

        created_at_time: createAtTime,
      };

      return actor.send_dfx(sendArgs);
    });
    return response;
  }
}

// export const requestNNSDelegation = async (
//   identity: SignIdentity,
// ): Promise<DelegationIdentity> => {
//   const tenMinutesInMsec = 10 * 1000 * 60;
//   const date = new Date(Date.now() + tenMinutesInMsec);
//   return requestDelegation(identity, { canisterId, date });
// };
