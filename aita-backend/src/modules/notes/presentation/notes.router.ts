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
    this.router.get('/', authenticate, (req, res) => this.controller.getNotes(req, res))
    this.router.post('/', authenticate, (req, res) => this.controller.createNote(req, res))
    this.router.post('/sync', authenticate, (req, res) => this.controller.syncNotes(req, res))
    this.router.put('/:id', authenticate, (req, res) => this.controller.updateNote(req, res))
    this.router.delete('/:id', authenticate, (req, res) => this.controller.deleteNote(req, res))
  }
}
