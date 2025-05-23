/**
 * Hex encoded transfer ID bytes
 * 
 * A hex string is easier to work with than a list of numbers
 */
export type TransferID = string

/**
 * @param transfers 
 * List of sorted transfers, earliest first
 * 
 * @param after 
 * Not including this transfer
 * 
 * @returns
 * Filtered list of transfers
 */
export function filterTransfersAfter(transfers: TransferID[], after: TransferID): TransferID[] {
    const cutOff = transfers.findIndex(id => id == after)

    if (cutOff != -1) {
        return transfers.slice(cutOff + 1)
    } else {
        return transfers
    }
}