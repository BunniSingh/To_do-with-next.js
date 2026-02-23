"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import AddTodo from "@/components/AddTodo";
import TodoList from "@/components/TodoList";
import DarkModeToggle from "@/components/ui/DarkModeToggle";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Home() {
  const { data: session, status } = useSession();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editTodo, setEditTodo] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, todoId: null });
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function loadTodos() {
    if (status === "authenticated") {
      setLoading(true);
      try {
        const res = await fetch("/api/todos");
        if (res.ok) {
          const data = await res.json();
          setTodos(data);
        } else if (res.status === 401) {
          router.push("/login");
        }
      } catch (error) {
        console.error("Error loading todos:", error);
      } finally {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let isActive = true;

    if (status === "authenticated") {
      loadTodos();
    }

    return () => {
      isActive = false;
    };
  }, [status]);

  function handleEdit(todo) {
    if (status !== "authenticated") return;
    setEditMode(true);
    setEditTodo(todo);
  }

  function handleCancelEdit() {
    setEditMode(false);
    setEditTodo(null);
  }

  function handleDelete(id) {
    if (status !== "authenticated") return;
    setConfirmDialog({ isOpen: true, todoId: id });
  }

  function confirmDelete() {
    const id = confirmDialog.todoId;
    if (!id) return;

    fetch(`/api/todos/?id=${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          setToast({ message: "Failed to delete todo.", type: "error" });
          return;
        }
        setToast({ message: "Todo deleted successfully!", type: "success" });
        loadTodos();
      })
      .catch((error) => {
        console.error("Error deleting todo:", error);
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
          setToast({ message: "Failed to toggle todo.", type: "error" });
          return;
        }
        loadTodos();
      })
      .catch((error) => {
        console.error("Error toggling todo:", error);
        setToast({ message: "Failed to toggle todo.", type: "error" });
      });
  }

  const handleSignOut = async () => {
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
            onAdd={loadTodos} 
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
