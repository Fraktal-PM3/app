import { NextResponse } from "next/server";
import { getFireFly } from "../packages/service";

export async function GET() {
  try {
    const firefly = await getFireFly();
    
    // Fetch all private messages using FireFly API
    // The getMessages() method retrieves messages from the FireFly node
    const messages = await firefly.getMessages();
    
    // Filter for private messages only (exclude blockchain/broadcast messages)
    const privateMessages = messages.filter(
      (msg) => msg.header?.type === "private" || !msg.header?.type
    );

    console.log("private messages:", privateMessages)

    return NextResponse.json({
      success: true,
      messages: privateMessages,
      count: privateMessages.length,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}
