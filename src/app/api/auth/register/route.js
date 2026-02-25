import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createUser, checkUserExists } from "@/lib/usersDb";
import { validateName, validatePassword, isValidEmail, sanitizeString } from "@/lib/validation";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate email
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if user already exists
    const userExists = await checkUserExists(email);
    if (userExists) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in MongoDB
    const newUser = await createUser(
      sanitizeString(nameValidation.value),
      email.toLowerCase().trim(),
      hashedPassword
    );

    // Return success response (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(
      { message: "User registered successfully", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}