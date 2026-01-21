export class Mutex {
    private buffer: SharedArrayBuffer;
    private state: Int32Array;

    constructor(buffer: SharedArrayBuffer | undefined = undefined) {
        this.buffer = buffer ? buffer : new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
        this.state = new Int32Array(this.buffer);

        if (!buffer) {
            Atomics.store(this.state, 0, 0); // unlocked
        }
    }

    getBuffer(): SharedArrayBuffer {
        return this.buffer;
    }

    lock(): void {
        while (Atomics.compareExchange(this.state, 0, 0, 1) !== 0) {
            Atomics.wait(this.state, 0, 1);
        }
    }

    unlock(): void {
        Atomics.store(this.state, 0, 0);
        Atomics.notify(this.state, 0, 1);
    }
}