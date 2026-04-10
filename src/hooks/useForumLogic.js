import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase/firebaseApp';
import { 
  collection, query, orderBy, onSnapshot, getDocs, writeBatch,
  addDoc, serverTimestamp, deleteDoc, doc, updateDoc 
} from 'firebase/firestore';

// Slug generator utility
export function generateSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ö/g, "o").replace(/ő/g, "o")
    .replace(/ú/g, "u").replace(/ü/g, "u").replace(/ű/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function useForumLogic(user) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [viewedIds, setViewedIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // Real-time listener for posts
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "forum_posts"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        // Client side calculated time if needed, but we mostly use Firebase serverTimestamp
      }));
      setPosts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for user notifications
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreatePost = async (data, postId = null) => {
    try {
      const postData = {
        ...data,
        slug: generateSlug(data.title),
        updatedAt: serverTimestamp(),
      };

      if (postId) {
        const ref = doc(db, "forum_posts", postId);
        await updateDoc(ref, postData);
      } else {
        await addDoc(collection(db, "forum_posts"), {
          ...postData,
          createdAt: serverTimestamp(),
          views: 0,
          likes: 0,
          comments: 0,
          pinned: false,
          hot: false,
          locked: false,
          solved: false,
          authorId: user?.uid || null,
          authorName: user?.displayName || "Anonymous",
          authorAvatar: user?.photoURL || null
        });
      }
    } catch (e) {
      console.error("Save error:", e);
      throw e;
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteDoc(doc(db, "forum_posts", postId));
    } catch (e) {
      console.error("Delete error:", e);
      throw e;
    }
  };

  const toggleStatus = async (postId, field, value) => {
    try {
      await updateDoc(doc(db, "forum_posts", postId), { [field]: value });
    } catch (e) {
      console.error("Status toggle error:", e);
      throw e;
    }
  };

  const markNotificationRead = async (id) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "notifications", id), { read: true });
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "users", user.uid, "notifications"));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.error("Error clearing notifications:", e);
    }
  };

  const deleteNotification = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "notifications", id));
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const categoryMatch = selectedCategory === "all" || p.category === selectedCategory;
      const searchMatch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.content || "").toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [posts, selectedCategory, searchQuery]);

  return {
    posts: filteredPosts,
    loading,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    bookmarkedIds, setBookmarkedIds,
    viewedIds, setViewedIds,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    deleteNotification,
    isNewPostModalOpen, setIsNewPostModalOpen,
    editingPost, setEditingPost,
    handleCreatePost,
    handleDeletePost,
    toggleStatus
  };
}
