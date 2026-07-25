import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

type ContentType = 'video' | 'quiz' | 'game';

export const completeLinkedTasks = async (
  userId: string,
  contentType: ContentType,
  contentId: string
) => {
  const tasks = await Task.find({
    assignedTo: userId,
    contentType,
    contentId,
    status: { $ne: 'completed' },
  });

  for (const task of tasks) {
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    await User.findByIdAndUpdate(userId, { $inc: { points: task.points } });
  }

  return tasks;
};