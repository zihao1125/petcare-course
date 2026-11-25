import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import ImageViewer from '../components/ImageViewer';
import {
  Avatar,
  Badge,
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  Empty,
  ErrorText,
  SectionTitle,
  Spinner,
  inputCls
} from '../components/ui';
import {
  FORUM_ACCEPT,
  MAX_FORUM_FILES,
  fileListToArray,
  forumFileKind,
  validateForumFile,
  type ForumFileKind
} from '../upload';
import type { ForumComment, ForumPost } from '../types';

const MAX_TITLE = 10;
const MAX_CONTENT = 2000;
const MAX_COMMENT = 500;

interface PendingFile {
  key: string;
  file: File;
  kind: ForumFileKind;
  preview?: string;
}

function fmtDateTime(value?: string | null) {
  return value ? value.slice(0, 16) : '';
}

function fmtSize(bytes: number) {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const KIND_LABEL: Record<ForumFileKind, string> = { image: '图片', video: '视频', file: '文档' };

function AttachmentIcon({ kind }: { kind: ForumFileKind }) {
  const paths = {
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m4.5 17.5 4.8-4.6a1.6 1.6 0 0 1 2.2 0l2.2 2.1a1.6 1.6 0 0 0 2.2 0l1.5-1.4 2.1 2" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9.5v5l4.5-2.5z" />
      </>
    ),
    file: (
      <>
        <path d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z" />
        <path d="M14 3.5V8h4M8.5 12h7M8.5 15.5h5" />
      </>
    )
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}

function PostAttachments({ post }: { post: ForumPost }) {
  const images = post.attachments.filter((item) => item.kind === 'image');
  const videos = post.attachments.filter((item) => item.kind === 'video');
  const docs = post.attachments.filter((item) => item.kind === 'file');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (post.attachments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setViewerIndex(index)}
              className="group relative overflow-hidden rounded-xl border border-slate-200"
              title={item.name}
            >
              <img
                src={item.url}
                alt={item.name}
                loading="lazy"
                className="aspect-square w-full object-cover transition group-hover:opacity-90"
              />
            </button>
          ))}
        </div>
      )}

      {videos.map((item) => (
        <video
          key={item.id}
          src={item.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-96 w-full rounded-xl border border-slate-200 bg-black"
        />
      ))}

      {docs.map((item) => (
        <a
          key={item.id}
          href={`${item.url}?download=1&name=${encodeURIComponent(item.name)}`}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <AttachmentIcon kind="file" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{item.name}</span>
            <span className="block text-xs text-slate-400">文档 · {fmtSize(item.size)} · 点击下载</span>
          </span>
          <span className="shrink-0 text-xs font-medium text-teal-700">下载</span>
        </a>
      ))}

      <ImageViewer
        images={images.map((item) => ({
          src: item.url,
          alt: item.name,
          caption: item.name,
          downloadUrl: `${item.url}?download=1&name=${encodeURIComponent(item.name)}`,
          downloadName: item.name
        }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
      />
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  onDelete
}: {
  comment: ForumComment;
  onReply: (comment: ForumComment) => void;
  onDelete: (comment: ForumComment) => void;
}) {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin' || user?.id === comment.user_id;
  return (
    <div className="flex gap-2.5">
      <Avatar name={comment.author.username} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-800">{comment.author.username}</span>
          {comment.author.role === 'admin' && <Badge className="bg-teal-50 text-teal-800">管理员</Badge>}
          {comment.reply_to && (
            <span className="text-[11px] text-teal-700">回复 @{comment.reply_to.username}</span>
          )}
          <span className="text-[11px] text-slate-400">{fmtDateTime(comment.created_at)}</span>
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="text-xs text-teal-700 transition hover:text-teal-900"
            >
              回复
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment)}
                className="text-xs text-slate-400 transition hover:text-red-600"
              >
                删除
              </button>
            )}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

function CommentList({
  comments,
  onReply,
  onDeleted
}: {
  comments: ForumComment[];
  onReply: (comment: ForumComment) => void;
  onDeleted: (commentId: number, deletedCount: number) => void;
}) {
  if (comments.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">还没有评论，来聊两句吧</p>;
  }

  const byId = new Map(comments.map((item) => [item.id, item]));
  const rootIdOf = (comment: ForumComment) => {
    let current = comment;
    const seen = new Set<number>();
    while (current.parent_id && byId.has(current.parent_id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parent_id)!;
    }
    return current.id;
  };

  const roots = comments.filter((item) => !item.parent_id);
  const groups = new Map<number, ForumComment[]>();
  roots.forEach((root) => groups.set(root.id, []));
  comments.forEach((item) => {
    if (!item.parent_id) return;
    const rootId = rootIdOf(item);
    if (groups.has(rootId)) groups.get(rootId)!.push(item);
  });

  const remove = async (comment: ForumComment) => {
    const hasReplies = comments.some((item) => item.parent_id === comment.id);
    const message = hasReplies
      ? '删除这条评论会同时删除它下面的回复，确定删除吗？'
      : '确定删除这条评论吗？';
    if (!window.confirm(message)) return;
    try {
      const data = await api<{ ok: boolean; deleted_count: number }>(`/forum/comments/${comment.id}`, {
        method: 'DELETE'
      });
      onDeleted(comment.id, data.deleted_count || 1);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <ul className="space-y-2.5">
      {roots.map((root) => {
        const replies = groups.get(root.id) || [];
        return (
          <li key={root.id} className="rounded-xl bg-slate-50/70 px-3 py-2">
            <CommentItem comment={root} onReply={onReply} onDelete={remove} />
            {replies.length > 0 && (
              <ul className="mt-2 space-y-2 border-l-2 border-teal-100 pl-3">
                {replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} onReply={onReply} onDelete={remove} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function removeCommentTree(list: ForumComment[], rootId: number) {
  const ids = new Set<number>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of list) {
      if (item.parent_id && ids.has(item.parent_id) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
    }
  }
  return list.filter((item) => !ids.has(item.id));
}

function PostCard({
  post,
  onDeleted,
  onCommentDelta
}: {
  post: ForumPost;
  onDeleted: (postId: number) => void;
  onCommentDelta: (postId: number, delta: number) => void;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<ForumComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: number; username: string } | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const canDeletePost = user?.role === 'admin' || user?.id === post.user_id;

  const loadComments = async () => {
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const data = await api<{ comments: ForumComment[] }>(`/forum/posts/${post.id}/comments`);
      setComments(data.comments);
    } catch (err) {
      setComments(null);
      setCommentsError(err instanceof Error ? err.message : '评论加载失败');
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && comments === null && !commentsLoading) loadComments();
  };

  const startReply = (comment: ForumComment) => {
    setReplyTarget({ id: comment.id, username: comment.author.username });
    setCommentError('');
    window.requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const deletePost = async () => {
    if (!window.confirm('确定删除这条帖子吗？帖子的评论和附件也会一起删除。')) return;
    setPostBusy(true);
    try {
      await api(`/forum/posts/${post.id}`, { method: 'DELETE' });
      onDeleted(post.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setPostBusy(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');
    const content = commentText.trim();
    if (!content) {
      setCommentError('请输入评论内容');
      return;
    }
    if (content.length > MAX_COMMENT) {
      setCommentError(`评论不能超过 ${MAX_COMMENT} 个字符`);
      return;
    }
    setCommentBusy(true);
    try {
      const data = await api<{ comment: ForumComment }>(`/forum/posts/${post.id}/comments`, {
        method: 'POST',
        body: { content, parentId: replyTarget?.id ?? null }
      });
      setComments((prev) => [...(prev || []), data.comment]);
      setCommentText('');
      setReplyTarget(null);
      onCommentDelta(post.id, 1);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '评论失败');
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar name={post.author.username} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{post.author.username}</span>
            {post.author.role === 'admin' && <Badge className="bg-teal-50 text-teal-800">管理员</Badge>}
            <span className="text-xs text-slate-400">{fmtDateTime(post.created_at)}</span>
          </div>
          {post.title && <h3 className="mt-1 break-words text-base font-semibold text-slate-900">{post.title}</h3>}
        </div>
        {canDeletePost && (
          <button
            type="button"
            onClick={deletePost}
            disabled={postBusy}
            className="shrink-0 text-xs text-slate-400 transition hover:text-red-600 disabled:opacity-50"
          >
            {postBusy ? '删除中…' : '删除'}
          </button>
        )}
      </div>

      {post.content && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{post.content}</p>
      )}

      <PostAttachments post={post} />

      <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5">
        <button type="button" onClick={toggleComments} className={btnGhost}>
          {expanded ? '收起评论' : `评论 ${post.comment_count}`}
        </button>
        {post.comment_count > 0 && !expanded && (
          <span className="text-xs text-slate-400">已有 {post.comment_count} 条评论</span>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {commentsLoading && <p className="text-xs text-slate-400">正在加载评论…</p>}
          {commentsError && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              <span>{commentsError}</span>
              <button type="button" className="font-medium underline" onClick={loadComments}>
                重试
              </button>
            </div>
          )}
          {!commentsLoading && !commentsError && comments && (
            <CommentList
              comments={comments}
              onReply={startReply}
              onDeleted={(commentId, deletedCount) => {
                const remaining = comments ? removeCommentTree(comments, commentId) : null;
                setComments(remaining);
                if (replyTarget && !(remaining || []).some((item) => item.id === replyTarget.id)) {
                  setReplyTarget(null);
                }
                onCommentDelta(post.id, -deletedCount);
              }}
            />
          )}
          <form onSubmit={submitComment} className="space-y-2">
            {replyTarget && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-800">
                <span className="min-w-0 truncate">正在回复 @{replyTarget.username}</span>
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="shrink-0 font-medium text-teal-700 hover:text-teal-900"
                >
                  取消回复
                </button>
              </div>
            )}
            <textarea
              ref={commentInputRef}
              className={`${inputCls} min-h-20 resize-y`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTarget ? `回复 @${replyTarget.username}…` : '写下你的评论…'}
              maxLength={MAX_COMMENT}
              disabled={commentBusy}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {commentText.length}/{MAX_COMMENT}
              </span>
              <button type="submit" className={btnPrimary} disabled={commentBusy || !commentText.trim()}>
                {commentBusy ? '发送中…' : '发表评论'}
              </button>
            </div>
            <ErrorText>{commentError}</ErrorText>
          </form>
        </div>
      )}
    </Card>
  );
}

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [postError, setPostError] = useState('');
  const [posting, setPosting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ posts: ForumPost[] }>('/forum/posts');
      setPosts(data.posts);
    } catch (err) {
      setPosts(null);
      setError(err instanceof Error ? err.message : '论坛加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      pendingRef.current.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    },
    []
  );

  const addFiles = (list: FileList | null) => {
    const incoming = fileListToArray(list);
    if (incoming.length === 0) return;
    const next = [...pending];
    let message = '';
    for (const file of incoming) {
      if (next.length >= MAX_FORUM_FILES) {
        message = `一次最多上传 ${MAX_FORUM_FILES} 个附件`;
        break;
      }
      const fileError = validateForumFile(file);
      const kind = forumFileKind(file);
      if (fileError || !kind) {
        message = fileError || '不支持的文件类型';
        continue;
      }
      next.push({
        key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        kind,
        preview: kind === 'image' ? URL.createObjectURL(file) : undefined
      });
    }
    setPending(next);
    setPostError(message);
  };

  const removePending = (key: string) => {
    setPending((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.key !== key);
    });
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    const t = title.trim();
    const c = content.trim();
    if (!t && !c && pending.length === 0) {
      setPostError('请输入内容，或添加图片、视频、文档');
      return;
    }
    if (t.length > MAX_TITLE) {
      setPostError(`标题不能超过 ${MAX_TITLE} 个字`);
      return;
    }
    setPosting(true);
    try {
      const form = new FormData();
      form.append('title', t);
      form.append('content', c);
      pending.forEach((item) => form.append('files', item.file));
      const data = await api<{ post: ForumPost }>('/forum/posts', { method: 'POST', form });
      setPosts((prev) => [data.post, ...(prev || [])]);
      pending.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
      setPending([]);
      setTitle('');
      setContent('');
      window.setTimeout(() => feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPosting(false);
    }
  };

  const updateCommentCount = (postId: number, delta: number) => {
    setPosts((prev) =>
      (prev || []).map((post) =>
        post.id === postId ? { ...post, comment_count: Math.max(0, post.comment_count + delta) } : post
      )
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-teal-700">养宠人的交流空间</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">交流论坛</h1>
        <p className="mt-1 text-sm text-slate-500">
          发帖分享养宠日常，图片、视频和文档都可以一起上传；所有主人和管理员都能看到。
        </p>
      </div>

      <Card>
        <SectionTitle action={<span className="text-xs text-slate-400">标题 {title.length}/{MAX_TITLE} 字</span>}>
          发布帖子
        </SectionTitle>
        <form onSubmit={submitPost} className="space-y-3">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选，最多 10 个字）"
            maxLength={MAX_TITLE}
            disabled={posting}
          />
          <textarea
            className={`${inputCls} min-h-28 resize-y`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说点什么吧：养宠经验、问题求助、日常分享…"
            maxLength={MAX_CONTENT}
            disabled={posting}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              正文 {content.length}/{MAX_CONTENT}
            </span>
            <span className="text-[11px] text-slate-400">
              附件 {pending.length}/{MAX_FORUM_FILES}
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!posting) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!posting) addFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-3 transition ${
              dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white/70'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={FORUM_ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <AttachmentIcon kind="image" />
                </span>
                <span>
                  <span className="block font-medium">图片、视频或文档</span>
                  <span className="block text-xs text-slate-400">
                    点击添加或拖到这里；图片 ≤5MB、视频 ≤50MB、文档 ≤20MB
                  </span>
                </span>
              </div>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => fileRef.current?.click()}
                disabled={posting || pending.length >= MAX_FORUM_FILES}
              >
                ＋ 添加附件
              </button>
            </div>

            {pending.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {pending.map((item) => (
                  <div key={item.key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2">
                    {item.preview ? (
                      <img src={item.preview} alt={item.file.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <AttachmentIcon kind={item.kind} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {KIND_LABEL[item.kind]} · {fmtSize(item.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(item.key)}
                      disabled={posting}
                      className="shrink-0 text-xs text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ErrorText>{postError}</ErrorText>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={posting}
          >
            {posting ? '发布中…' : '发布帖子'}
          </button>
          <p className="text-xs text-slate-400">
            支持 JPG / PNG / WEBP 图片、MP4 / WEBM 视频，以及 PDF / Word / Excel / PPT / TXT 文档，一次最多 6 个附件。
          </p>
        </form>
      </Card>

      <div ref={feedRef} className="space-y-3">
        <SectionTitle action={<span className="text-xs text-slate-400">共 {posts?.length ?? 0} 条</span>}>
          全部帖子
        </SectionTitle>

        {loading && posts === null && <Spinner text="正在加载帖子…" />}

        {!loading && posts === null && (
          <Card>
            <p className="text-sm font-medium text-red-700">论坛加载失败</p>
            <p className="mt-1 text-sm text-slate-500">{error || '请检查服务是否正常，然后重试。'}</p>
            <button type="button" className={`${btnPrimary} mt-3`} onClick={load} disabled={loading}>
              重新加载
            </button>
          </Card>
        )}

        {posts !== null && posts.length === 0 && <Empty text="论坛还没有帖子，来发布第一条吧" />}

        {posts?.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDeleted={(postId) => setPosts((prev) => (prev || []).filter((item) => item.id !== postId))}
            onCommentDelta={updateCommentCount}
          />
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-400">
        发帖人和管理员可以删除帖子；评论作者和管理员可以删除评论。
      </p>
    </div>
  );
}
