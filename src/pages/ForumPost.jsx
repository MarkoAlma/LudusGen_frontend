import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, onSnapshot, updateDoc, increment, 
  arrayUnion, arrayRemove, collection, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
import { MyUserContext } from '../context/MyUserProvider';
import PostHeader from '../components/forum/post/PostHeader';
import PostContent from '../components/forum/post/PostContent';
import CommentSection from '../components/forum/post/CommentSection';
import PostSidebar from '../components/forum/post/PostSidebar';
import { Loader2 } from 'lucide-react';

const CATEGORIES = {
  chat: { label: "Chat AI", emoji: "💬", color: "#a78bfa" },
  code: { label: "Code AI", emoji: "🧠", color: "#34d399" },
  image: { label: "Kép AI", emoji: "🖼️", color: "#f472b6" },
  audio: { label: "Hang AI", emoji: "🎵", color: "#fb923c" },
  threed: { label: "3D AI", emoji: "🧊", color: "#38bdf8" },
};

const ADMIN_UIDS = ["T7fU9Zp3N5M9wz2G8xQ4L1rV6bY2"];

export default function ForumPost() {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(MyUserContext);
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Real-time Post Listener
  useEffect(() => {
    if (!slug) return;
    
    // We assume slug is the post ID for better performance, 
    // but in list view we link with category/slug_or_id
    const postRef = doc(db, "forum_posts", slug);
    
    const unsubscribe = onSnapshot(postRef, (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setPost(data);
        if (user) {
          setLiked(data.likedBy?.includes(user.uid));
        }
        setLoading(false);
      } else {
        // Fallback or 404
        setLoading(false);
      }
    });

    // Increment Views once per mount
    updateDoc(postRef, { views: increment(1) }).catch(() => {});

    return () => unsubscribe();
  }, [slug, user]);

  // Reading Progress Listener
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setReadingProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLike = async () => {
    if (!user || !post) return;
    const postRef = doc(db, "forum_posts", post.id);
    
    try {
      if (liked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
        setLiked(false);
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
        setLiked(true);
        
        // Notification for author
        if (post.authorId && post.authorId !== user.uid) {
          await addDoc(collection(db, "users", post.authorId, "notifications"), {
            type: "like",
            text: `${user.displayName || "Valaki"} kedvelte a témádat: "${post.title}"`,
            postId: post.id,
            category: post.category,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (e) {
      console.error("Like error:", e);
    }
  };

  const handleVote = async (optionId) => {
    if (!user || !post?.poll) return;
    // Check if user already voted (optional logic, for now simple increment)
    const postRef = doc(db, "forum_posts", post.id);
    const updatedOptions = post.poll.options.map(opt => 
      opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
    );
    
    await updateDoc(postRef, {
      "poll.options": updatedOptions
    });
  };

  const handleAddComment = async (text, parentId = null) => {
    if (!user || !post) return;
    const postRef = doc(db, "forum_posts", post.id);
    
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.uid,
      authorName: user.displayName || "Anonymous",
      authorAvatar: user.photoURL,
      content: text,
      createdAt: new Date(), // Local for optimistic or we wait for server updates
      likes: 0,
      replies: [],
      parentId: parentId
    };

    try {
      // In this demo logic, comments are in an array (commentList)
      await updateDoc(postRef, {
        commentList: arrayUnion(newComment),
        comments: increment(1)
      });

      // Notification for author if it's a new main comment
      if (!parentId && post.authorId && post.authorId !== user.uid) {
        await addDoc(collection(db, "users", post.authorId, "notifications"), {
          type: "comment",
          text: `${user.displayName || "Valaki"} hozzászólt a témádhoz: "${post.title}"`,
          postId: post.id,
          category: post.category,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Comment error:", e);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user || !post) return;
    const postRef = doc(db, "forum_posts", post.id);
    const newList = (post.commentList || []).filter(c => c.id !== commentId);
    
    try {
      await updateDoc(postRef, {
        commentList: newList,
        comments: increment(-1)
      });
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03000a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#03000a] pt-32 text-center px-4">
        <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4">A téma nem található</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">Vagy törölték, vagy téves a hivatkozás.</p>
        <button onClick={() => navigate('/forum')} className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-primary font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">Vissza a közösséghez</button>
      </div>
    );
  }

  const cat = CATEGORIES[post.category] || CATEGORIES.chat;
  const color = cat.color;

  return (
    <div className="min-h-screen bg-[#03000a] text-white pb-40 relative">
      {/* Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1.5 bg-primary z-[150] shadow-[0_0_20px_rgba(138,43,226,0.5)] transition-all duration-100"
        style={{ width: `${readingProgress}%` }}
      />

      <div className="max-w-6xl mx-auto pt-10 px-4 md:px-8">
        <PostHeader 
          post={post}
          onBack={() => navigate('/forum')}
          color={color}
          liked={liked}
          likeCount={post.likes}
          onLike={handleLike}
          bookmarked={bookmarked}
          onBookmark={() => setBookmarked(!bookmarked)}
          onShare={() => {
            navigator.clipboard.writeText(window.location.href);
            // Could add a toast here
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-4">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
             <PostContent 
               content={post.content} 
               color={color} 
               poll={post.poll}
               onVote={handleVote}
             />
             
             <CommentSection 
                comments={post.commentList || []} 
                color={color}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                currentUser={user}
                isAdmin={isAdmin}
              />
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4">
             <PostSidebar 
               post={post}
               color={color}
               relatedPosts={[]} // Could be populated with search query
             />
          </div>
        </div>
      </div>
    </div>
  );
}