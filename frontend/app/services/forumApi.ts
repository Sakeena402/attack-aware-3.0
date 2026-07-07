// frontend/app/services/forumApi.ts

import { apiService } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForumPost {
  _id: string;
  userId: string;
  authorName: string;
  content: string;
  isUrdu: boolean;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
}

export interface ForumComment {
  _id: string;
  postId: string;
  userId: string;
  authorName: string;
  commentText: string;
  isUrdu: boolean;
  createdAt: string;
}

export interface CreatePostPayload {
  content: string;
  isUrdu: boolean;
}

export interface CreateCommentPayload {
  commentText: string;
  isUrdu: boolean;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const forumApi = {

  // GET all posts — newest first
  getAllPosts: async (): Promise<ForumPost[]> => {
    const res = await apiService.get<ForumPost[]>('/forum/posts');
    return Array.isArray(res.data) ? res.data : [];
  },

  // GET single post with comments
  getPostById: async (postId: string): Promise<ForumPost> => {
    const res = await apiService.get<ForumPost>(`/forum/posts/${postId}`);
    return res.data;
  },

  // GET comments for a post
  getComments: async (postId: string): Promise<ForumComment[]> => {
    const res = await apiService.get<ForumComment[]>(
      `/forum/posts/${postId}/comments`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  // POST — create new post
  createPost: async (payload: CreatePostPayload): Promise<ForumPost> => {
    const res = await apiService.post<ForumPost>('/forum/posts', payload);
    return res.data;
  },

  // POST — add comment to a post
  addComment: async (
    postId: string,
    payload: CreateCommentPayload
  ): Promise<ForumComment> => {
    const res = await apiService.post<ForumComment>(
      `/forum/posts/${postId}/comments`,
      payload
    );
    return res.data;
  },

  // PATCH — edit own post
  updatePost: async (
    postId: string,
    content: string
  ): Promise<ForumPost> => {
    const res = await apiService.patch<ForumPost>(
      `/forum/posts/${postId}`,
      { content }
    );
    return res.data;
  },

  // PATCH — edit own comment
  updateComment: async (
    postId: string,
    commentId: string,
    commentText: string
  ): Promise<ForumComment> => {
    const res = await apiService.patch<ForumComment>(
      `/forum/posts/${postId}/comments/${commentId}`,
      { commentText }
    );
    return res.data;
  },

  // DELETE — delete own post
  deletePost: async (postId: string): Promise<void> => {
    await apiService.delete(`/forum/posts/${postId}`);
  },

  // DELETE — delete own comment
  deleteComment: async (
    postId: string,
    commentId: string
  ): Promise<void> => {
    await apiService.delete(
      `/forum/posts/${postId}/comments/${commentId}`
    );
  },
};