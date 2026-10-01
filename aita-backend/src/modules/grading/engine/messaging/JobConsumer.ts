// @ts-nocheck
import { WorkerOrchestrator } from '../application/orchestrator/WorkerOrchestrator';

export class JobConsumer {
    constructor(private readonly orchestrator: WorkerOrchestrator) {}

    public async startConsumingAsync(queueName: string): Promise<void> {
        console.log(`[JobConsumer] Listening on queue: ${queueName}`);
        
        // Real implementation: channel.consume(queueName, msg => { ... })
        // On receive:
        // const { submissionId } = JSON.parse(msg.content.toString());
        // await this.orchestrator.processSubmissionAsync(submission, assignment);
        // channel.ack(msg);
    }
}

