// @ts-nocheck
import { EventEmitter } from 'events';

type Job<T> = () => Promise<T>;

export class SubmissionQueue extends EventEmitter {
    private concurrency: number;
    private running: number = 0;
    private queue: { job: Job<any>, resolve: (value: any) => void, reject: (reason?: any) => void }[] = [];

    constructor(concurrency: number = 3) {
        super();
        this.concurrency = concurrency;
    }

    public async enqueue<T>(job: Job<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ job, resolve, reject });
            this.processNext();
        });
    }

    private async processNext() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.running++;
        const item = this.queue.shift();
        if (item) {
            try {
                const result = await item.job();
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            } finally {
                this.running--;
                this.processNext();
            }
        }
    }

    public getQueueLength(): number {
        return this.queue.length;
    }

    public getRunningCount(): number {
        return this.running;
    }
}

// Global instance to be used across requests.
// Used by lecturer-triggered batch grading ("chấm dồn"): 3 submissions evaluate in parallel
// so grading a whole class after the deadline stays fast.
export const globalSubmissionQueue = new SubmissionQueue(3);

// Background grading ("chấm ngầm"): strictly one submission at a time, in the order the
// students submitted. A submission is enqueued the moment it is created, so its position in
// this queue is its submission order — downloading and unzipping happen inside the slot too,
// not before it.
export const continuousSubmissionQueue = new SubmissionQueue(1);

