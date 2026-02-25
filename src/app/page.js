"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import AddTodo from "@/components/AddTodo";
import TodoList from "@/components/TodoList";
import DarkModeToggle from "@/components/ui/DarkModeToggle";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editTodo, setEditTodo] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, todoId: null });
  
  // Track if we've already loaded todos to prevent refetching
  const hasLoadedTodos = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Memoized loadTodos function
  const loadTodos = useCallback(async (forceRefresh = false) => {
    if (status !== "authenticated") return;
    
    // Allow force refresh even if already loaded
    if (hasLoadedTodos.current && !forceRefresh) return;
    
    setLoading(true);
    hasLoadedTodos.current = true;
    
    try {
      console.log('[Todo API] Fetching todos...');
      const res = await fetch("/api/todos");
      console.log('[Todo API] Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[Todo API] Received todos:', data.length);
        setTodos(data);
      } else if (res.status === 401) {
        console.log('[Todo API] Unauthorized, redirecting to login');
        router.push("/login");
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Todo API] Error:', res.status, errorData);
        setToast({ message: 'Failed to load todos', type: 'error' });
      }
    } catch (error) {
      console.error("[Todo API] Network error:", error);
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [status, router]);

  // Load todos once when authenticated
  useEffect(() => {
    if (status === "authenticated" && !hasLoadedTodos.current) {
      loadTodos();
    }
  }, [status, loadTodos]);

  function handleEdit(todo) {
    if (status !== "authenticated") return;
    setEditMode(true);
    setEditTodo(todo);
  }

  function handleCancelEdit() {
    setEditMode(false);
    setEditTodo(null);
  }

  // Optimistic add/update function
  const handleAddOrUpdate = async (text, isEdit, editId) => {
    const previousTodos = [...todos];
    let tempId = null;
    
    // Optimistically update UI
    if (isEdit) {
      setTodos(todos.map(t => t.id === editId ? { ...t, text } : t));
    } else {
      tempId = `temp_${Date.now()}`;
      const newTodo = {
        id: tempId,
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTodos([newTodo, ...todos]);
    }

    try {
      console.log('[Page] Sending todo:', { text, isEdit, editId });
      const res = await fetch("/api/todos", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          ...(isEdit && { id: editId })
        }),
      });

      console.log('[Page] API response status:', res.status);
      const result = await res.json();
      console.log('[Page] API response:', result);

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return { success: false };
        }
        // Revert on failure
        setTodos(previousTodos);
        return { success: false, error: result.error || (isEdit ? "Failed to update todo." : "Failed to add todo.") };
      }

      // Success - update with real data from server
      if (!isEdit) {
        // Replace temp todo with real one
        setTodos(prev => prev.map(t => t.id === tempId ? { 
          id: result.id,
          text: result.text,
          completed: result.completed,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        } : t));
      } else {
        // Update the edited todo with server data
        setTodos(prev => prev.map(t => t.id === editId ? { 
          ...t,
          text: result.text,
          updatedAt: result.updatedAt,
        } : t));
      }
      
      return { success: true };
    } catch (error) {
      console.error("[Page] Error saving todo:", error);
      // Revert on error
      setTodos(previousTodos);
      return { success: false, error: isEdit ? "Failed to update todo." : "Failed to add todo." };
    }
  };

  function handleDelete(id) {
    if (status !== "authenticated") return;
    setConfirmDialog({ isOpen: true, todoId: id });
  }

  function confirmDelete() {
    const id = confirmDialog.todoId;
    if (!id) return;

    // Optimistically update UI
    const previousTodos = [...todos];
    setTodos(todos.filter(todo => todo.id !== id));

    fetch(`/api/todos/?id=${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          // Revert on failure
          setTodos(previousTodos);
          setToast({ message: "Failed to delete todo.", type: "error" });
          return;
        }
        setToast({ message: "Todo deleted successfully!", type: "success" });
        // No need to reload, we already updated optimistically
      })
      .catch((error) => {
        console.error("Error deleting todo:", error);
        // Revert on error
        setTodos(previousTodos);
        setToast({ message: "Failed to delete todo.", type: "error" });
      })
      .finally(() => {
        setConfirmDialog({ isOpen: false, todoId: null });
      });
  }

  function cancelDelete() {
    setConfirmDialog({ isOpen: false, todoId: null });
  }

  function handleToggle(todo) {
    if (status !== "authenticated") return;

    // Optimistically update UI
    const previousTodos = [...todos];
    const updatedTodos = todos.map(t => 
      t.id === todo.id ? { ...t, completed: !t.completed } : t
    );
    setTodos(updatedTodos);

    fetch(`/api/todos/?id=${todo.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "toggle" }),
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          // Revert on failure
          setTodos(previousTodos);
          setToast({ message: "Failed to toggle todo.", type: "error" });
          return;
        }
        // Success - no need to reload, UI already updated
      })
      .catch((error) => {
        console.error("Error toggling todo:", error);
        // Revert on error
        setTodos(previousTodos);
        setToast({ message: "Failed to toggle todo.", type: "error" });
      });
  }

  const handleSignOut = async () => {
    hasLoadedTodos.current = false;
    setTodos([]);
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading your todos...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect is handled above)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Todo App</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your tasks efficiently</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/chat')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors relative"
                aria-label="Open chat"
              >
                <MessageCircle className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <DarkModeToggle />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Welcome back,</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{session.user.name || session.user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <AddTodo
            onAddOrUpdate={handleAddOrUpdate}
            onEdit={handleCancelEdit}
            todos={todos}
            editMode={editMode}
            editTodo={editTodo}
            showToast={(message, type) => setToast({ message, type })}
          />

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-gray-300 dark:text-gray-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No todos yet. Add one above!</p>
            </div>
          ) : (
            <TodoList todos={todos} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
          )}
        </main>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Todo?"
        message="Are you sure you want to delete this todo? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
