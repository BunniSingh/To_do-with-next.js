import { getTodosByUserId, createTodo, updateTodo, deleteTodo, toggleTodo } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todos = await getTodosByUserId(session.user.id);
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Todo text is required" }, { status: 400 });
    }

    const newTodo = await createTodo(text.trim(), session.user.id);
    return NextResponse.json(newTodo);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, text } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Todo text is required" }, { status: 400 });
    }

    const updatedTodo = await updateTodo(id, text.trim(), session.user.id);

    if (!updatedTodo) {
      return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error("Update todo error:", error);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }

    const deletedTodo = await deleteTodo(id, session.user.id);

    if (!deletedTodo) {
      return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(deletedTodo);
  } catch (error) {
    console.error("Delete todo error:", error);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { action } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }

    if (action === "toggle") {
      const toggledTodo = await toggleTodo(id, session.user.id);
      
      if (!toggledTodo) {
        return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 });
      }

      return NextResponse.json(toggledTodo);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Toggle todo error:", error);
    return NextResponse.json({ error: "Failed to toggle todo" }, { status: 500 });
  }
}
