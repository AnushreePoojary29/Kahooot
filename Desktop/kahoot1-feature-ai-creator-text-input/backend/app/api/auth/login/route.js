import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }
        const userId = await redis.get(`professor:email:${email}`);
        if (!userId) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        const userData = await redis.get(`professor:${userId}`);
        if (!userData) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        const user = typeof userData === "string" ? JSON.parse(userData) : userData;
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        const token = await createSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: "professor",
        });
        const response = NextResponse.json({ success: true, userId: user.id });
        setSessionCookie(response, token);
        return response;
    }
    catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
