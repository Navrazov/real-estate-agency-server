import { NoteModel } from '../../models/Note.js';

export const noteService = {
  async getByListing(userId: string, listingId: string) {
    const notes = await NoteModel.find({ userId, listingId }).sort({ createdAt: -1 }).lean();
    return notes.map(n => ({
      id: n._id.toString(),
      listingId: n.listingId,
      text: n.text,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  },

  async getAllByUser(userId: string) {
    const notes = await NoteModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return notes.map(n => ({
      id: n._id.toString(),
      listingId: n.listingId,
      text: n.text,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  },

  async create(userId: string, listingId: string, text: string) {
    const note = await NoteModel.create({ userId, listingId, text });
    return {
      id: note._id.toString(),
      listingId: note.listingId,
      text: note.text,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  },

  async update(noteId: string, userId: string, text: string) {
    const note = await NoteModel.findOneAndUpdate(
      { _id: noteId, userId },
      { text },
      { new: true }
    );
    if (!note) return null;
    return {
      id: note._id.toString(),
      listingId: note.listingId,
      text: note.text,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  },

  async delete(noteId: string, userId: string): Promise<boolean> {
    const result = await NoteModel.deleteOne({ _id: noteId, userId });
    return result.deletedCount > 0;
  },
};
