import { type TransferID } from "./TransferID"

export interface TokenizedAccountProvider {
    /**
     * @returns
     * USD value of account holdings
     */
    balance: Promise<number>

    /**
     * @returns
     * All historical transfer IDs, sorted from earliest to latest
     */
    transferHistory: Promise<TransferID[]>

    /**
     * @param transfers 
     * Only aggregate the deposits/withdrawals of these transfers (so not of all transfers)
     * 
     * @returns
     * USD value aggregate of deposits (positive) and withdrawals (negative)
     */
    deposits(transfers: TransferID[]): Promise<number>
}