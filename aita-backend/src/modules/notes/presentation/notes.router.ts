import { Router } from 'express'
import { NotesController } from './notes.controller.js'
import { authenticate } from '../../../middleware/auth.js'

export class NotesRouter {
  public readonly router: Router
  private readonly controller: NotesController

  constructor() {
    this.router = Router()
    this.controller = new NotesController()
    this.initRoutes()
  }

  private initRoutes() {
    // Optionally authenticate if token present, but don't strictly require for dev flexibility
    const optionalAuth = (req: any, res: any, next: any) => {
      if (req.headers.authorization) {
        return authenticate(req, res, next)
      }
      next()
    }

    this.router.get('/', optionalAuth, (req, res) => this.controller.getNotes(req, res))
    this.router.post('/', optionalAuth, (req, res) => this.controller.createNote(req, res))
    this.router.post('/sync', optionalAuth, (req, res) => this.controller.syncNotes(req, res))
    this.router.put('/:id', optionalAuth, (req, res) => this.controller.updateNote(req, res))
    this.router.delete('/:id', optionalAuth, (req, res) => this.controller.deleteNote(req, res))
  }
}
