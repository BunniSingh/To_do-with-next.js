export default function TodoList({ todos, onEdit, onDelete, onToggle }) {
  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className="bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-lg p-4 flex justify-between items-center group transition duration-200 border border-gray-200 dark:border-slate-600"
        >
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => onToggle && onToggle(todo)}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center transition duration-200 ${
                todo.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 dark:border-slate-500 hover:border-green-500'
              }`}
              aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {todo.completed && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <span className={`text-gray-800 dark:text-gray-200 font-medium truncate ${
              todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
            }`}>{todo.text}</span>
          </div>

          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => onEdit(todo)}
              className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition duration-200"
              aria-label={`Edit todo ${todo.text}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              onClick={() => {
                onDelete(todo.id);
              }}
              className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition duration-200"
              aria-label={`Delete todo ${todo.text}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
