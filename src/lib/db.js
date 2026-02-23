import mongoose from 'mongoose';
import dbConnect from './mongodb';

const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Prevent model recompilation in development
const Todo = mongoose.models.Todo || mongoose.model('Todo', todoSchema);

// Helper function to validate ObjectId format
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function getTodosByUserId(userId) {
  await dbConnect();
  const todos = await Todo.find({ userId }).sort({ createdAt: -1 });
  return todos.map(todo => ({
    id: todo._id.toString(),
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }));
}

export async function createTodo(text, userId) {
  await dbConnect();
  const todo = await Todo.create({ text, userId });
  return {
    id: todo._id.toString(),
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
}

export async function updateTodo(id, text, userId) {
  await dbConnect();
  
  if (!isValidObjectId(id)) {
    return null;
  }
  
  const updated = await Todo.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), userId },
    { text },
    { new: true }
  );
  return updated ? {
    id: updated._id.toString(),
    text: updated.text,
    completed: updated.completed,
  } : null;
}

export async function deleteTodo(id, userId) {
  await dbConnect();
  
  if (!isValidObjectId(id)) {
    return null;
  }
  
  const deleted = await Todo.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id), userId });
  return deleted ? {
    id: deleted._id.toString(),
    text: deleted.text,
    completed: deleted.completed,
  } : null;
}

export async function toggleTodo(id, userId) {
  await dbConnect();
  
  if (!isValidObjectId(id)) {
    return null;
  }
  
  const todo = await Todo.findById(id);
  if (!todo || todo.userId !== userId) {
    return null;
  }
  
  todo.completed = !todo.completed;
  await todo.save();
  
  return {
    id: todo._id.toString(),
    text: todo.text,
    completed: todo.completed,
  };
}
