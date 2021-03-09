/**
 * Used index to quick push and pop, 
 */
export class Queue<T> {
    private producerIndex = BigInt(0);
    private consumerIndex = BigInt(0);
    private mask: bigint;
    private data: Array<T>;

    /**
     * init the queu
     * @param capacity at most how many elements you want save
     */
    constructor(capacity: number) {
        this.data = new Array(capacity)
        const len = getCapacity(capacity);
        this.data = new Array(len);
        this.mask = BigInt(len - 1);
    }

    /**
     * push item to queue
     * @param item object
     * @returns true if success
     */
    public enqueue(item: T): boolean {
        const offset = Number(this.producerIndex & this.mask);
        if (isNotNull(this.data[offset])) {
            return false;
        }
        this.data[offset] = item;
        this.producerIndex++;
        return true;
    }

    /**
     * pop item from queue
     * @returns item
     */
    public dequeue(): T {
        const offset = Number(this.consumerIndex & this.mask);
        const item = this.data[offset];
        if (isNotNull(item)) {
            delete this.data[offset];
            this.consumerIndex++;
        }
        return item;
    }

    /**
     * get last pushed item
     */
    public back(): T {
        const offset = Number(this.producerIndex & this.mask);
        return this.data[offset];
    }

    /**
     * get next pop item
     */
    public front(): T {
        const offset = Number(this.consumerIndex & this.mask);
        return this.data[offset];
    }

    /**
     * if queue is empty
     */
    public empty(): boolean {
        return this.producerIndex === this.consumerIndex;
    }

    public size(): number {
        return Number(this.producerIndex - this.consumerIndex);
    }
}

/**
 * get capacity by leading 1 in bits
 */
function getCapacity(x: number): number {
    const one = BigInt(1)
    let i = 0;
    for (let y = BigInt(x); y > 0; y >>= one, i++);
    return 1 << i;
}

function isNotNull(value: any) {
    return value !== null && value !== undefined;
}
