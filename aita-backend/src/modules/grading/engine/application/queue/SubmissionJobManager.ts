// @ts-nocheck
import { EventEmitter } from 'events';

export type JobState = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobProgress {
    submissionId: string;
    state: JobState;
    progressPercent: number;
    currentTask: string;
    result?: any;
    error?: string;
    meta?: any;
    isCancelled?: boolean;
}

class SubmissionJobManager extends EventEmitter {
    private jobs: Map<string, JobProgress> = new Map();

    public initJob(submissionId: string) {
        this.jobs.set(submissionId, {
            submissionId,
            state: 'queued',
            progressPercent: 0,
            currentTask: 'Waiting in queue...'
        });
        this.emitJobUpdate(submissionId);
    }

    public updateProgress(submissionId: string, percent: number, task: string, meta?: any) {
        const job = this.jobs.get(submissionId);
        if (job) {
            job.state = 'processing';
            job.progressPercent = percent;
            job.currentTask = task;
            if (meta !== undefined) {
                job.meta = meta;
            } else {
                delete job.meta;
            }
            this.emitJobUpdate(submissionId);
        }
    }

    public completeJob(submissionId: string, result: any) {
        const job = this.jobs.get(submissionId);
        if (job) {
            job.state = 'completed';
            job.progressPercent = 100;
            job.currentTask = 'Evaluation complete';
            job.result = result;
            this.emitJobUpdate(submissionId);
        }
    }

    public failJob(submissionId: string, error: string) {
        const job = this.jobs.get(submissionId);
        if (job) {
            job.state = 'failed';
            job.error = error;
            job.currentTask = 'Failed';
            this.emitJobUpdate(submissionId);
        }
    }

    public cancelJob(submissionId: string) {
        const job = this.jobs.get(submissionId);
        if (job) {
            job.isCancelled = true;
            this.emitJobUpdate(submissionId);
        }
    }

    public getJob(submissionId: string): JobProgress | undefined {
        return this.jobs.get(submissionId);
    }

    public clearJob(submissionId: string) {
        this.jobs.delete(submissionId);
    }

    private emitJobUpdate(submissionId: string) {
        const job = this.jobs.get(submissionId);
        if (job) {
            // Emits an event specific to this submission
            this.emit(`update:${submissionId}`, job);
        }
    }
}

export const globalJobManager = new SubmissionJobManager();

