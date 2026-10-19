// @ts-nocheck
import { EventEmitter } from 'events';
import { gradingLease } from './grading-lease.js';
import { realtimeBus } from '../../../../../shared/infrastructure/realtime-bus.js';

export type JobState = 'queued' | 'processing' | 'completed' | 'failed';
export interface GradingEvent {
    stage: 0 | 1 | 2 | 3 | 4;
    status: 'started' | 'completed' | 'failed' | 'skipped' | 'info' | 'warning';
    message: string;
    runtime?: string;
}

export interface JobProgress {
    submissionId: string;
    state: JobState;
    progressPercent: number;
    currentTask: string;
    result?: any;
    error?: string;
    meta?: any;
    isCancelled?: boolean;
    generation?: string;
    generationStartedAt?: number;
    requestVersion?: number;
    attempt?: number;
    logs?: ({ id: string; timestamp: string; message: string; state: JobState; progress: number } & Partial<GradingEvent>)[];
    currentStage?: number;
    eventSequence?: number;
}

class SubmissionJobManager extends EventEmitter {
    private jobs: Map<string, JobProgress> = new Map();
    private expirations = new Map<string, ReturnType<typeof setTimeout>>();

    public initJob(submissionId: string, message = 'Đang chờ đến lượt chấm...', version?: { requestVersion: number; attempt: number }) {
        const current = this.jobs.get(submissionId);
        const lease = gradingLease.getStore();
        const requestVersion = version?.requestVersion ?? lease?.requestVersion ?? lease?.startedAt ?? Date.now();
        const attempt = version?.attempt ?? lease?.attempt ?? 0;
        if (current && ((current.requestVersion || 0) > requestVersion || (current.requestVersion === requestVersion && (current.attempt || 0) > attempt))) return;
        clearTimeout(this.expirations.get(submissionId));
        this.expirations.delete(submissionId);
        this.jobs.set(submissionId, {
            submissionId,
            state: 'queued',
            generation: gradingLease.getStore()?.owner,
            generationStartedAt: gradingLease.getStore()?.startedAt || Date.now(),
            requestVersion,
            attempt,
            progressPercent: 0,
            currentTask: message
        });
        this.emitJobUpdate(submissionId);
    }

    public updateProgress(submissionId: string, percent: number, task: string, meta?: any) {
        const job = this.jobs.get(submissionId);
        if (job && (!gradingLease.getStore() || job.generation === gradingLease.getStore()?.owner)) {
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

    public recordEvent(submissionId: string, event: GradingEvent) {
        const job = this.jobs.get(submissionId);
        if (!job || (gradingLease.getStore() && job.generation !== gradingLease.getStore()?.owner)) return;
        if (event.status === 'started') job.currentStage = event.stage;
        const logs = job.logs ||= [];
        job.eventSequence = (job.eventSequence || 0) + 1;
        logs.push({ ...event, message: event.message.slice(0, 2000), id: `${job.requestVersion}:${job.attempt}:${job.eventSequence}`, timestamp: new Date().toISOString(), state: job.state, progress: job.progressPercent });
        if (logs.length > 200) logs.shift();
        this.emitJobUpdate(submissionId, false);
    }

    public completeJob(submissionId: string, result: any) {
        const job = this.jobs.get(submissionId);
        if (job && (!gradingLease.getStore() || job.generation === gradingLease.getStore()?.owner)) {
            job.state = 'completed';
            job.progressPercent = 100;
            job.currentTask = 'Đã hoàn tất đánh giá và lưu báo cáo';
            job.result = result;
            this.emitJobUpdate(submissionId);
            this.expireTerminal(submissionId, job);
        }
    }

    public failJob(submissionId: string, error: string) {
        const job = this.jobs.get(submissionId);
        if (job && (!gradingLease.getStore() || job.generation === gradingLease.getStore()?.owner)) {
            job.state = 'failed';
            job.error = error;
            job.currentTask = 'Lượt chấm không hoàn tất';
            this.emitJobUpdate(submissionId);
            this.expireTerminal(submissionId, job);
        }
    }

    public cancelJob(submissionId: string) {
        const job = this.jobs.get(submissionId);
        if (job && (!gradingLease.getStore() || job.generation === gradingLease.getStore()?.owner)) {
            job.isCancelled = true;
            this.emitJobUpdate(submissionId);
        }
    }

    public getJob(submissionId: string): JobProgress | undefined {
        return this.jobs.get(submissionId);
    }

    public receiveProgress(progress: JobProgress) {
        const current = this.jobs.get(progress.submissionId);
        if (current && ((current.requestVersion || 0) > (progress.requestVersion || 0) || (current.requestVersion === progress.requestVersion && (current.attempt || 0) > (progress.attempt || 0)))) return;
        if (current && current.requestVersion === progress.requestVersion && current.attempt === progress.attempt) {
            if (['completed', 'failed'].includes(current.state) && !['completed', 'failed'].includes(progress.state)) return;
            if (current.state === 'processing' && progress.state === 'processing' && progress.progressPercent < current.progressPercent) return;
        }
        this.jobs.set(progress.submissionId, progress);
        this.emit(`update:${progress.submissionId}`, progress);
        if (['completed', 'failed'].includes(progress.state)) this.expireTerminal(progress.submissionId, progress);
    }

    public clearJob(submissionId: string) {
        this.jobs.delete(submissionId);
        clearTimeout(this.expirations.get(submissionId));
        this.expirations.delete(submissionId);
    }

    private expireTerminal(id: string, job: JobProgress) {
        clearTimeout(this.expirations.get(id));
        const timer = setTimeout(() => { if (this.jobs.get(id) === job) this.clearJob(id); }, 10 * 60 * 1000);
        timer.unref?.();
        this.expirations.set(id, timer);
    }

    public emitAssignmentEvent(assignmentId: string, event: any) {
        this.emit(`assignment_event:${assignmentId}`, event);
        realtimeBus.publish('assignment-event', { assignmentId, event });
    }

    private emitJobUpdate(submissionId: string, recordCurrent = true) {
        const job = this.jobs.get(submissionId);
        if (job && (!gradingLease.getStore() || job.generation === gradingLease.getStore()?.owner)) {
            const logs = job.logs ||= [];
            const message = String(job.error || job.currentTask).slice(0, 2000);
            const previous = logs[logs.length - 1];
            if (recordCurrent && (!previous || previous.message !== message || previous.state !== job.state)) {
                job.eventSequence = (job.eventSequence || 0) + 1;
                logs.push({ id: `${job.requestVersion}:${job.attempt}:${job.eventSequence}`, timestamp: new Date().toISOString(), message, state: job.state, progress: job.progressPercent });
                if (logs.length > 200) logs.shift();
            }
            // Emits an event specific to this submission
            this.emit(`update:${submissionId}`, job);
            // Completed reports are fetched through the authorized result endpoint.
            const { result: _result, meta: _meta, ...progress } = job;
            realtimeBus.publish('grading-progress', progress);
        }
    }
}

export const globalJobManager = new SubmissionJobManager();
realtimeBus.subscribe('grading-progress', progress => {
    globalJobManager.receiveProgress(progress);
});
realtimeBus.subscribe('assignment-event', ({ assignmentId, event }) => globalJobManager.emit(`assignment_event:${assignmentId}`, event));

