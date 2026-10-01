// @ts-nocheck
import { JobConsumer } from './JobConsumer';

export class WorkerHost {
    constructor(private readonly consumer: JobConsumer) {}

    public async startAsync(): Promise<void> {
        console.log(`[WorkerHost] Starting distributed worker...`);
        
        // Starts consuming from multiple queues concurrently
        await Promise.all([
            this.consumer.startConsumingAsync('assessment.backend'),
            this.consumer.startConsumingAsync('assessment.frontend')
        ]);
        
        console.log(`[WorkerHost] Worker is online.`);
    }
}

