import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

type ContentType = 'video' | 'quiz' | 'game';

export const completeLinkedTasks = async (
  userId: string,
  contentType: ContentType,
  contentId: string
) => {
  const pending = await Task.find({
    assignedTo: userId,
    contentType,
    contentId,
    status: { $ne: 'completed' },
  })
    .select('_id')
    .lean();

  const completed = [];

  for (const { _id } of pending) {
    // Claim the task atomically so two parallel requests cannot both award its points
    const task = await Task.findOneAndUpdate(
      { _id, status: { $ne: 'completed' } },
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!task) continue;

    await User.findByIdAndUpdate(userId, { $inc: { points: task.points } });
    completed.push(task);
  }

  return completed;
};