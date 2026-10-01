import { EventEmitter } from 'events'

class ClassEventsEmitter extends EventEmitter {}

export const classEvents = new ClassEventsEmitter()
// Increase default max listeners for concurrent SSE client connections
classEvents.setMaxListeners(500)
