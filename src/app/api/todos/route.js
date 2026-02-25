import { getTodosByUserId, createTodo, updateTodo, deleteTodo, toggleTodo } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { validateTodoText, isValidObjectId } from "@/lib/validation";

export async function GET(req) {
  try {
    const session = await auth();
    console.log('[Todo API GET] Session:', session ? 'Authenticated' : 'No session');

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[Todo API GET] User ID:', session.user.id);
    const todos = await getTodosByUserId(session.user.id);
    console.log('[Todo API GET] Found', todos.length, 'todos');
    return NextResponse.json(todos);
  } catch (error) {
    console.error("[Todo API GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch todos", details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    console.log('[Todo API POST] Session:', session ? 'Authenticated' : 'No session');

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log('[Todo API POST] Request body:', body);

    const { text } = body;

    // Validate todo text
    const textValidation = validateTodoText(text);
    if (!textValidation.valid) {
      console.log('[Todo API POST] Validation failed:', textValidation.error);
      return NextResponse.json({ error: textValidation.error }, { status: 400 });
    }

    console.log('[Todo API POST] Creating todo for user:', session.user.id);
    const newTodo = await createTodo(textValidation.value, session.user.id);
    console.log('[Todo API POST] Created todo:', newTodo);
    return NextResponse.json(newTodo);
  } catch (error) {
    console.error("[Todo API POST] Error:", error);
    return NextResponse.json({ error: "Failed to create todo", details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log('[Todo API PUT] Request body:', body);

    const { id, text } = body;

    // Validate ID
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    // Validate todo text
    const textValidation = validateTodoText(text);
    if (!textValidation.valid) {
      return NextResponse.json({ error: textValidation.error }, { status: 400 });
    }

    console.log('[Todo API PUT] Updating todo:', id, 'for user:', session.user.id);
    const updatedTodo = await updateTodo(id, textValidation.value, session.user.id);
    console.log('[Todo API PUT] Updated todo:', updatedTodo);

    if (!updatedTodo) {
      return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error("[Todo API PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update todo", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    console.log('[Todo API DELETE] Deleting todo:', id);

    // Validate ID
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    const deletedTodo = await deleteTodo(id, session.user.id);
    console.log('[Todo API DELETE] Deleted todo:', deletedTodo);

    if (!deletedTodo) {
      return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(deletedTodo);
  } catch (error) {
    console.error("[Todo API DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete todo", details: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { action } = await req.json();

    console.log('[Todo API PATCH] Toggling todo:', id, 'action:', action);

    // Validate ID
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    if (action === "toggle") {
      const toggledTodo = await toggleTodo(id, session.user.id);
      console.log('[Todo API PATCH] Toggled todo:', toggledTodo);

      if (!toggledTodo) {
        return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 });
      }

      return NextResponse.json(toggledTodo);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Todo API PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to toggle todo", details: error.message }, { status: 500 });
  }
}
