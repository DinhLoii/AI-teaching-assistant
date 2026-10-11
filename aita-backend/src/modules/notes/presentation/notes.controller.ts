import type { Request, Response } from 'express'
import { prisma } from '../../../database/prisma.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class NotesController extends BaseController {
  async getNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const notes = await prisma.note.findMany({
        where: userId ? { UserId: userId } : {},
        orderBy: [{ DateStr: 'asc' }, { TimeStr: 'asc' }],
      })

      const mapped = notes.map((n) => ({
        id: n.Id,
        dateStr: n.DateStr,
        timeStr: n.TimeStr,
        content: n.Content,
        status: n.Status as 'pending' | 'completed',
        createdAt: n.CreatedAt,
      }))

      this.ok(res, mapped, 'Notes fetched successfully')
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message || 'Error fetching notes', 500))
    }
  }

  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || null
      const { dateStr, timeStr, content, status } = req.body

      if (!dateStr || !timeStr || !content) {
        res.status(400).json(ApiResponse.error('dateStr, timeStr, and content are required', 400))
        return
      }

      const note = await prisma.note.create({
        data: {
          UserId: userId,
          DateStr: dateStr,
          TimeStr: timeStr,
          Content: content,
          Status: status || 'pending',
        },
      })

      this.created(
        res,
        {
          id: note.Id,
          dateStr: note.DateStr,
          timeStr: note.TimeStr,
          content: note.Content,
          status: note.Status,
        },
        'Note created successfully'
      )
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message || 'Error creating note', 500))
    }
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const { dateStr, timeStr, content, status } = req.body

      const existing = await prisma.note.findUnique({ where: { Id: id } })
      if (!existing) {
        res.status(404).json(ApiResponse.error('Note not found', 404))
        return
      }

      const updated = await prisma.note.update({
        where: { Id: id },
        data: {
          ...(dateStr !== undefined && { DateStr: dateStr }),
          ...(timeStr !== undefined && { TimeStr: timeStr }),
          ...(content !== undefined && { Content: content }),
          ...(status !== undefined && { Status: status }),
        },
      })

      this.ok(
        res,
        {
          id: updated.Id,
          dateStr: updated.DateStr,
          timeStr: updated.TimeStr,
          content: updated.Content,
          status: updated.Status,
        },
        'Note updated successfully'
      )
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message || 'Error updating note', 500))
    }
  }

  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      await prisma.note.delete({ where: { Id: id } })
      this.ok(res, { id }, 'Note deleted successfully')
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message || 'Error deleting note', 500))
    }
  }

  async syncNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || null
      const { notes } = req.body

      if (Array.isArray(notes)) {
        for (const item of notes) {
          if (!item.dateStr || !item.timeStr || !item.content) continue
          await prisma.note.upsert({
            where: { Id: item.id || 'non-existent-id' },
            create: {
              ...(item.id && { Id: item.id }),
              UserId: userId,
              DateStr: item.dateStr,
              TimeStr: item.timeStr,
              Content: item.content,
              Status: item.status || 'pending',
            },
            update: {
              DateStr: item.dateStr,
              TimeStr: item.timeStr,
              Content: item.content,
              Status: item.status || 'pending',
            },
          })
        }
      }

      const allNotes = await prisma.note.findMany({
        where: userId ? { UserId: userId } : {},
        orderBy: [{ DateStr: 'asc' }, { TimeStr: 'asc' }],
      })

      this.ok(
        res,
        allNotes.map((n) => ({
          id: n.Id,
          dateStr: n.DateStr,
          timeStr: n.TimeStr,
          content: n.Content,
          status: n.Status as 'pending' | 'completed',
        })),
        'Notes synced with Neon DB successfully'
      )
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message || 'Error syncing notes', 500))
    }
  }
}
