import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
export async function POST(req) {
    try {
        const { name, email, password } = await req.json();
        if (!name || !email || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }
        const existingUser = await redis.get(`professor:email:${email}`);
        if (existingUser) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }
        const userId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = {
            id: userId,
            name,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
        };
        await redis.set(`professor:${userId}`, JSON.stringify(user));
        await redis.set(`professor:email:${email}`, userId);
        const token = await createSessionToken({ userId, email, name, role: "professor" });
        const response = NextResponse.json({ success: true, userId });
        setSessionCookie(response, token);
        return response;
    }
    catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
