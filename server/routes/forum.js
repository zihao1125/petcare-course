import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { all, get, run } from '../db/index.js';
import { HttpError } from '../utils/http.js';
import { text } from '../utils/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  uploadForumFiles,
  forumFileKind,
  forumFileSizeLimit,
  FORUM_MAX_FILES,
  FORUM_FILE_HINT
} from '../middleware/upload.js';
import { forumFileUrl, removeForumFileByUrl } from '../utils/files.js';

const router = express.Router();
router.use(requireAuth);

// 未完善账号与密保的普通用户不能使用论坛；管理员不受此限制
router.use((req, res, next) => {
  if (req.user.role === 'user' && req.user.profile_completed !== 1) {
    return next(new HttpError(403, '请先完善账号与密保信息'));
  }
  next();
});

function readTitle(value) {
  const title = text(value);
  if (!title) return null;
  if (title.length > 10) throw new HttpError(400, '标题不能超过 10 个字');
  return title;
}

function readContent(value) {
  const content = text(value);
  if (content.length > 2000) throw new HttpError(400, '正文不能超过 2000 个字符');
  return content;
}

function decodeOriginalName(name) {
  const base = path.basename(String(name || ''));
  if (!base) return '附件';
  const hasMultibyte = Array.from(base).some((ch) => ch.codePointAt(0) > 255);
  if (hasMultibyte) return base.slice(0, 150);
  const decoded = Buffer.from(base, 'latin1').toString('utf8');
  return (decoded.includes('\uFFFD') ? base : decoded).slice(0, 150) || '附件';
}

function removeFiles(files) {
  for (const file of files) {
    try {
      fs.rmSync(file.path, { force: true });
    } catch (err) {
      console.warn('[warn] 清理论坛附件失败', file.path, err.message);
    }
  }
}

function shapePost(row, attachments = []) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    created_at: row.created_at,
    comment_count: row.comment_count,
    author: { id: row.user_id, username: row.author_name, role: row.author_role },
    attachments: attachments.map((item) => ({
      id: item.id,
      url: item.file_path,
      name: item.file_name,
      kind: item.kind,
      size: item.size
    }))
  };
}

function shapeComment(row) {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id ?? null,
    content: row.content,
    created_at: row.created_at,
    author: { id: row.user_id, username: row.author_name, role: row.author_role },
    reply_to: row.reply_to_name
      ? { id: row.reply_to_user_id, username: row.reply_to_name }
      : null
  };
}

const POST_SELECT = `SELECT p.*, u.username AS author_name, u.role AS author_role,
  (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) AS comment_count
  FROM forum_posts p JOIN users u ON u.id = p.user_id`;

const COMMENT_SELECT = `SELECT c.*, u.username AS author_name, u.role AS author_role,
  pu.id AS reply_to_user_id, pu.username AS reply_to_name
  FROM forum_comments c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN forum_comments pc ON pc.id = c.parent_id
  LEFT JOIN users pu ON pu.id = pc.user_id`;

router.get('/posts', (req, res) => {
  const rows = all(`${POST_SELECT} ORDER BY p.id DESC`);
  const ids = rows.map((row) => row.id);
  let attachments = [];
  if (ids.length > 0) {
    attachments = all(
      `SELECT id, post_id, file_path, file_name, kind, size FROM forum_attachments
        WHERE post_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
      ids
    );
  }
  const grouped = new Map();
  for (const item of attachments) {
    if (!grouped.has(item.post_id)) grouped.set(item.post_id, []);
    grouped.get(item.post_id).push(item);
  }
  res.json({ posts: rows.map((row) => shapePost(row, grouped.get(row.id) || [])) });
});

router.post('/posts', uploadForumFiles.array('files', FORUM_MAX_FILES), (req, res) => {
  const files = req.files || [];
  let saved = false;
  try {
    const title = readTitle((req.body || {}).title);
    const content = readContent((req.body || {}).content);

    const prepared = [];
    for (const file of files) {
      const kind = forumFileKind(file.originalname);
      if (!kind) throw new HttpError(400, `附件格式不支持，${FORUM_FILE_HINT}`);
      const limit = forumFileSizeLimit(kind);
      if (file.size > limit) {
        throw new HttpError(
          400,
          kind === 'image'
            ? '图片大小不能超过 5MB'
            : kind === 'video'
              ? '视频大小不能超过 50MB'
              : '文档大小不能超过 20MB'
        );
      }
      prepared.push({
        file,
        name: decodeOriginalName(file.originalname),
        kind,
        url: forumFileUrl(file.filename)
      });
    }

    if (!content && prepared.length === 0) {
      throw new HttpError(400, '请输入内容，或添加图片、视频、文档');
    }

    const result = run('INSERT INTO forum_posts (user_id, title, content) VALUES (?, ?, ?)', [
      req.user.id,
      title,
      content
    ]);
    const postId = result.lastInsertRowid;
    try {
      for (const item of prepared) {
        run(
          'INSERT INTO forum_attachments (post_id, file_path, file_name, kind, size) VALUES (?, ?, ?, ?, ?)',
          [postId, item.url, item.name, item.kind, item.file.size]
        );
      }
      saved = true;
    } catch (err) {
      run('DELETE FROM forum_posts WHERE id = ?', [postId]);
      throw err;
    }

    const post = get(`${POST_SELECT} WHERE p.id = ?`, [postId]);
    const attachments = all(
      'SELECT id, post_id, file_path, file_name, kind, size FROM forum_attachments WHERE post_id = ? ORDER BY id',
      [postId]
    );
    res.status(201).json({ post: shapePost(post, attachments) });
  } catch (err) {
    if (!saved) removeFiles(files);
    throw err;
  }
});

router.delete('/posts/:postId', (req, res) => {
  const postId = Number(req.params.postId);
  const post = get('SELECT * FROM forum_posts WHERE id = ?', [postId]);
  if (!post) throw new HttpError(404, '帖子不存在');
  if (req.user.role !== 'admin' && post.user_id !== req.user.id) {
    throw new HttpError(403, '只能删除自己发布的帖子');
  }
  const attachments = all('SELECT file_path FROM forum_attachments WHERE post_id = ?', [postId]);
  for (const item of attachments) removeForumFileByUrl(item.file_path);
  run('DELETE FROM forum_posts WHERE id = ?', [postId]);
  res.json({ ok: true });
});

router.get('/posts/:postId/comments', (req, res) => {
  const postId = Number(req.params.postId);
  if (!get('SELECT id FROM forum_posts WHERE id = ?', [postId])) {
    throw new HttpError(404, '帖子不存在');
  }
  const rows = all(`${COMMENT_SELECT} WHERE c.post_id = ? ORDER BY c.id ASC`, [postId]);
  res.json({ comments: rows.map(shapeComment) });
});

router.post('/posts/:postId/comments', (req, res) => {
  const postId = Number(req.params.postId);
  const post = get('SELECT id FROM forum_posts WHERE id = ?', [postId]);
  if (!post) throw new HttpError(404, '帖子不存在');
  const body = req.body || {};
  const content = text(body.content);
  if (!content) throw new HttpError(400, '评论内容不能为空');
  if (content.length > 500) throw new HttpError(400, '评论不能超过 500 个字符');

  let parentId = null;
  if (body.parentId !== undefined && body.parentId !== null && text(body.parentId) !== '') {
    parentId = Number(body.parentId);
    const parent = Number.isInteger(parentId)
      ? get('SELECT id, post_id FROM forum_comments WHERE id = ?', [parentId])
      : null;
    if (!parent || parent.post_id !== postId) {
      throw new HttpError(400, '要回复的评论不存在');
    }
  }

  const result = run(
    'INSERT INTO forum_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    [postId, req.user.id, parentId, content]
  );
  const row = get(`${COMMENT_SELECT} WHERE c.id = ?`, [result.lastInsertRowid]);
  res.status(201).json({ comment: shapeComment(row) });
});

router.delete('/comments/:commentId', (req, res) => {
  const comment = get('SELECT * FROM forum_comments WHERE id = ?', [Number(req.params.commentId)]);
  if (!comment) throw new HttpError(404, '评论不存在');
  if (req.user.role !== 'admin' && comment.user_id !== req.user.id) {
    throw new HttpError(403, '只能删除自己的评论');
  }
  const subtree = all(
    `WITH RECURSIVE subtree(id) AS (
       SELECT id FROM forum_comments WHERE id = ?
       UNION ALL
       SELECT c.id FROM forum_comments c JOIN subtree s ON c.parent_id = s.id
     )
     SELECT id FROM subtree ORDER BY id DESC`,
    [comment.id]
  );
  for (const item of subtree) {
    run('DELETE FROM forum_comments WHERE id = ?', [item.id]);
  }
  res.json({ ok: true, deleted_count: subtree.length });
});

export default router;
